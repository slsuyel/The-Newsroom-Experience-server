const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  "mongodb+srv://schoolDb:jhuorUxtvBrLMt4w@cluster0.37kn8jw.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("schoolDb").collection("users");
    const selectedClassCollection = client
      .db("schoolDb")
      .collection("selectedClass");
    const allClassCollection = client.db("schoolDb").collection("allClass");

    const addClassCollection = client.db("schoolDb").collection("addclass");

    /* User  */
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      return res.send(result);
    });

    /* All class */
    app.get("/addclass", async (req, res) => {
      const data = await addClassCollection.find({}).toArray();
      return res.send(data);
    });

    app.post("/selectedClasses", async (req, res) => {
      const data = req.body;
      const result = await selectedClassCollection.insertOne(data);
      return res.send(result);
    });

    app.get("/selectedClasses", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/selectedClasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    /* instructor/admin */

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { role: user?.role || null };
      res.send(result);
    });
    /* - - --- ------ */
    // http://localhost:5000/addclass
    app.post("/addclass", async (req, res) => {
      const data = req.body;
      const result = await addClassCollection.insertOne(data);
      return res.send(result);
    });

    app.get("/addclass", async (req, res) => {
      const result = await addClassCollection.find().toArray();
      res.send(result);
    });

   
    app.get("/addclasses", async (req, res) => {
      const email = req.query.email;
      if (email) {
        const query = { instructorEmail: email };
        const result = await addClassCollection.find(query).toArray();
        res.send(result);
      } else {
        const result = await addClassCollection.find().toArray();
        res.send(result);
      }
    });
    /* Admin */

    app.delete("/addclass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addClassCollection.deleteOne(query);
      res.send(result);
    });


    /* - - --- ------ */
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("School is open now");
});

app.listen(port, () => {
  console.log(`School is open on port ${port}`);
});
