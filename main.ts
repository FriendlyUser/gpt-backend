import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { connect  } from "npm:@planetscale/database@^1.4";
import { OpenAPIHono, createRoute, z } from 'npm:@hono/zod-openapi@0.9.5';
import { swaggerUI } from 'npm:@hono/swagger-ui@0.2.1';
import data from "./data.json" assert { type: "json" };

var db_host = Deno.env.get("DB_HOST");
var username = Deno.env.get("DB_USER");
var db = Deno.env.get("DB_NAME");
var password = Deno.env.get("DB_PASSWORD");
// Set up MySQL client
const conn = await connect({
  host: db_host,
  username: username,
  db: db,
  password: password,
  ssl: {
    rejectUnauthorized: true,
  },
});

const app = new OpenAPIHono()

app.openapi(
  createRoute({
    method: 'get',
    path: '/hello',
    responses: {
      200: {
        description: 'Respond a message',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string()
            })
          }
        }
      }
    }
  }),
  (c) => {
    return c.jsonT({
      message: 'hello'
    })
  }
)


app.openapi(
  createRoute({
    method: 'get',
    path: '/test',
    responses: {
      200: {
        description: 'Respond a test',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string()
            })
          }
        }
      }
    }
  }),
  (c) => {
    return c.jsonT({
      message: 'test'
    })
  }
)

app.openapi(
  createRoute({
    method: 'get',
    path: '/api/groceries',
    parameters: [
      {
        name: 'start_date',
        in: 'query',
        required: false,
        description: 'Start date for fetching groceries',
        schema: {
          type: 'string',
          format: 'date' // or 'date-time' depending on your format
        }
      },
      {
        name: 'end_date',
        in: 'query',
        required: false,
        description: 'End date for fetching groceries',
        schema: {
          type: 'string',
          format: 'date' // or 'date-time' depending on your format
        }
      }
    ],
    responses: {
      200: {
        description: 'List of groceries',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  flyer_path: { type: 'string' },
                  product_name: { type: 'string' },
                  data_product_id: { type: 'string' },
                  savings: { type: 'string' },
                  current_price: { type: 'string' },
                  start_date: { type: 'string', format: 'date-time' },
                  end_date: { type: 'string', format: 'date-time' },
                  description: { type: 'string' },
                  size: { type: 'string' },
                  quantity: { type: 'string' },
                  product_type: { type: 'string' },
                  frozen: { type: 'integer' },
                  see_more_link: { type: 'string' }
                },
                required: [
                  'label', 'flyer_path', 'product_name', 'data_product_id', 
                  'current_price', 'start_date', 'end_date', 'description', 
                  'size', 'quantity', 'frozen', 'see_more_link'
                  // Include 'savings' and 'product_type' if they are required fields
                ]
              }
            }
          }
        }
      },
      400: {
        description: 'Invalid request parameters'
      },
      500: {
        description: 'Internal Server Error'
      }
    }
  }),
  async (c) => {
    const start_date = c.req.query("start_date");
    const end_date = c.req.query("end_date");
    var query = ``;
    var result;
    if (start_date && end_date) {
      query = `
        SELECT * FROM grocery
        WHERE start_date >= ? AND end_date <= ?;
      `;
      result = await conn.execute(query, [start_date, end_date]);
    } else if (start_date && !end_date) {
      query = `
        SELECT * FROM grocery
        WHERE start_date >= ?;
      `;
      result = await conn.execute(query, [start_date]);
    } else if (end_date && !start_date) {
      query = `
      SELECT * FROM grocery
      WHERE end_date <= ?;
    `;
      result = await conn.execute(query, [end_date]);
    }

    try {
      var rows = result["rows"];
      return c.json(rows);
    } catch (error) {
      console.error(error);
      return c.text("An error occurred.", 500);
    }
    // Your existing logic to fetch and return groceries
  }
);


app.get("/", (c) => c.text("Welcome to dinosaur API!"));

app.get("/api/", (c) => c.json(data));

app.get("/api/dino/:dinosaur", (c) => {
  const dinosaur = c.req.param("dinosaur").toLowerCase();
  const found = data.find((item) => item.name.toLowerCase() === dinosaur);
  if (found) {
    return c.json(found);
  } else {
    return c.text("No dinosaurs found.");
  }
});

app.get("/api/groceriesLegacy", async (c) => {
  const start_date = c.req.query("start_date");
  const end_date = c.req.query("end_date");

  const query = `
    SELECT * FROM grocery
    WHERE start_date >= ? AND end_date <= ?;
  `;

  try {
    const result = await client.execute(query, [start_date, end_date]);
    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.text("An error occurred.", 500);
  }
});

app.get('/ui', swaggerUI({ url: '/doc' }));

app.doc('/doc', {
  info: {
    title: 'An API',
    version: 'v1'
  },
  openapi: '3.1.0'
});


Deno.serve(app.fetch);
