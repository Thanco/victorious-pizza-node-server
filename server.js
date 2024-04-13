const express = require('express');

const app = express();
// app.use(express.static('public'));
// app.use("/uploads", express.static("uploads"));
app.use(express.json());

const cors = require('cors');
app.use(cors());

require('dotenv').config();

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const mongoose = require("mongoose");

mongoose
    .connect(`mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.dero9go.mongodb.net/victorious-pizza?retryWrites=true&w=majority&appName=Cluster0`)
    .then(() => console.log("Connected to mongodb..."))
    .catch((err) => console.error("could not connect ot mongodb...", err));

const mongooseSchema = new mongoose.Schema({
    name: String,
    type: String,
    price: Number,
    shortDescription: String,
    longDescription: String,
    allergens: [String],
    image64: String,
  });

const MenuItem = mongoose.model("menuitems", mongooseSchema);

app.get('/api/menu', async (req, res) => {
    try {
        const result = await MenuItem.find();
        res.status(200).send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

const joi = require('joi');
const schema = joi.object({
    // _id: joi.allow(""),
    name: joi.string().min(5).required(),
    type: joi.string().min(3).required(),
    price: joi.number().min(0).required(),
    shortDescription: joi.string().min(15).required(),
    longDescription: joi.string().min(15).required(),
    allergens: joi.array().items(joi.string().min(3)).required(),
});

app.post('/api/menu', upload.single('image'), async (req, res) => {
    const validated = schema.validate(req.body);
    if (validated.error) {
        res.status(400).send(`Schema could not be validated: ${validated.error.details[0].message}`);
        return;
    }

    const newItem = new MenuItem({
        name: req.body.name,
        type: req.body.type,
        price: req.body.price,
        shortDescription: req.body.shortDescription,
        longDescription: req.body.longDescription,
        allergens: req.body.allergens,
    });

    if (req.file) {
        const image = validateImage(req.file);
        if (image == null) {
            res.status(400).send('Image too large');
            return;
        }
        newItem.image64 = image;
    }

    try {
        await newItem.save();
        res.status(201).send('New Item added');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.put('/api/menu/:id', upload.single('image'), async (req, res) => {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
        res.status(404).send('Item not found');
        return;
    }

    const validated = schema.validate(req.body);
    if (validated.error) {
        res.status(400).send(`Schema could not be validated: ${validated.error.details[0].message}`);
        return;
    }

    item.name = req.body.name;
    item.type = req.body.type;
    item.price = req.body.price;
    item.shortDescription = req.body.shortDescription;
    item.longDescription = req.body.longDescription;
    item.allergens = req.body.allergens;

    if (req.file) {
        item.image64 = validateImage(req.file);
    }

    try {
        await item.save();
        res.status(200).send('Item updated');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/api/menu/:id', async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndDelete(req.params.id);
        if (!item) {
            res.status(404).send('Item not found');
            return;
        }
        res.status(200).send('Item deleted');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

const validateImage = (file) => {
    if (file.size > 1000000) {
        return null;
    }
    return Buffer.from(file.buffer).toString('base64');
};

app.listen(3000, () => {
    console.log('Server listenig on port 3000');
});