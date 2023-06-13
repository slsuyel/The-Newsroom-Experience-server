const express = require("express");

const jwt = require("jsonwebtoken");

const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.PAYMENT_STRIPE_SK);

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.37kn8jw.mongodb.net/?retryWrites=true&w=majority`;

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
    //await client.connect();

    const addClassCollection = client.db("schoolDb").collection("addclass");

    const usersCollection = client.db("schoolDb").collection("users");
    const selectedClassCollection = client
      .db("schoolDb")
      .collection("selectedClass");

    const paymentCollection = client.db("schoolDb").collection("payments");

    /* JWT START */

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    /* --------------- */
    /* User  */
    app.post("/users", verifyJWT, async (req, res) => {
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
      const query = { status: "approved" };
      const data = await addClassCollection.find(query).toArray();
      return res.send(data);
    });

    app.post("/selectedClasses", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await selectedClassCollection.insertOne(data);
      return res.send(result);
    });

    app.get("/selectedClasses", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }

      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/selectedClasses/:id", verifyJWT, async (req, res) => {
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

    app.post("/addclass", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await addClassCollection.insertOne(data);
      return res.send(result);
    });

    // app.get("/addclass", async (req, res) => {
    //   const result = await addClassCollection.find().toArray();
    //   res.send(result);
    // });

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

    /* update class instructor */

    app.patch("/classupdate/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          className: req.body.className,
          availableSeats: req.body.availableSeats,
          price: req.body.price,
        },
      };
      const result = await addClassCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /*  */
    /* Admin */

    app.delete("/addclass/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addClassCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/addClass/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedData = req.body;
      // console.log(updatedData);
      const updateDoc = {
        $set: {
          status: updatedData.status,
        },
      };
      const result = await addClassCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    /* Feedback */
    app.put("/addClass/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { feedback } = req.body;

      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };

      const result = await addClassCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /* Manage Users */

    app.get("/users", verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    /* make role */
    app.put("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { role } = req.body;
      const updateDoc = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    /* - - --- ------ */

    // Payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //payment done

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const insertId = payment.classId;
      const mainId = payment.main_id;
      const query = { _id: new ObjectId(insertId) };
      const filter = { _id: new ObjectId(mainId) };
      const updateDoc = {
        $set: {
          availableSeats: parseInt(payment.availableSeats, 10) - 1,
        },
      };
      const reduceSeats = await addClassCollection.updateOne(filter, updateDoc);
      const deletedClass = await selectedClassCollection.deleteOne(query);
      res.send({ insertResult, deletedClass ,reduceSeats});
    });

    /*  */
    app.get("/payments", async (req, res) => {
      const email = req.query.email;
      const payments = await paymentCollection
        .find({ email })
        .sort({ date: -1 })
        .toArray();
      res.send(payments);
    });

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
