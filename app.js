const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dateFns = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertTodoObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const validateQuery = (request, response, next) => {
  const { category, priority, status, date } = request.query;
  const categoryValues = ["WORK", "HOME", "LEARNING"];
  const priorityValues = ["HIGH", "MEDIUM", "LOW"];
  const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  const isDateValid = dateFns.isValid(new Date(date));
  if (category && !categoryValues.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (priority && !priorityValues.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (status && !statusValues.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else {
    next();
  }
};

const validateBody = (request, response, next) => {
  const { category, priority, status, dueDate } = request.body;
  const categoryValues = ["WORK", "HOME", "LEARNING"];
  const priorityValues = ["HIGH", "LOW", "MEDIUM"];
  const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  const isDateValid = dateFns.isValid(new Date(dueDate));
  if (category && !categoryValues.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (priority && !priorityValues.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (status && !statusValues.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (dueDate && !isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

app.get("/todos/", validateQuery, async (request, response) => {
  const { priority, status, category, search_q } = request.query;
  const conditions = [
    search_q ? `todo LIKE '%${search_q}%'` : null,
    priority ? `priority = '${priority}'` : null,
    status ? `status = '${status}'` : null,
    category ? `category = '${category}'` : null,
  ];
  const conditionString = conditions.filter((element) => element).join(" AND ");
  const getTodosQuery = `
        SELECT
            *
        FROM 
            todo
        WHERE
            ${conditionString}
        `;
  const todosArray = await database.all(getTodosQuery);
  response.send(
    todosArray.map((eachTodo) => convertTodoObjectToResponseObject(eachTodo))
  );
});

app.get("/todos/:todoId", validateQuery, async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
    `;
  const todo = await database.get(getTodoQuery);
  response.send(convertTodoObjectToResponseObject(todo));
});

app.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;
    let day = dateFns.format(new Date(date), "yyyy-MM-dd");
    const getQuery = `
        SELECT * FROM todo WHERE due_date = '${day}';`;
    console.log(getQuery);
    const data = await database.all(getQuery);
    response.send(
      data.map((each) => ({
        id: each.id,
        todo: each.todo,
        priority: each.priority,
        status: each.status,
        category: each.category,
        dueDate: each.due_date,
      }))
    );
  } catch (error) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", validateBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let date = dateFns.format(new Date(dueDate), "yyyy-MM-dd");
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status, category, due_date )
  VALUES
    (${id}, '${todo}', '${priority}', '${status}', '${category}', '${date}');
    `;
  const dbResponse = await database.run(postTodoQuery);
  console.log(dbResponse);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", validateBody, async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      ${
        todo
          ? `todo= '${todo}'`
          : priority
          ? `priority= '${priority}'`
          : status
          ? `status= '${status}'`
          : category
          ? `category= '${category}'`
          : dueDate
          ? `due_date= '${dueDate}'`
          : ""
      }
    WHERE
      id = ${todoId};`;

  await database.run(updateTodoQuery);
  response.send(
    `${
      todo
        ? "Todo"
        : priority
        ? "Priority"
        : status
        ? "Status"
        : category
        ? "Category"
        : dueDate
        ? "Due Date"
        : ""
    } Updated`
  );
});

app.delete("/todos/:todoId/", validateQuery, async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
