import express from 'express';
import * as tf from '@tensorflow/tfjs';
import path from 'path';

const router = express.Router();

const readCsvData = async () => {
    try {
        const filePath = `file://${path.resolve(__dirname, '../kc_house_data.csv')}`;
        const readData = tf.data.csv(filePath);
        
        const points = readData.map((record) => {
            return {
                x: record.sqft_living,
                y: record.price
            }
        });
        const pointsArray = await points.toArray();
        return pointsArray;
    } catch(e) {
        console.log(e);
        return e;
    }
};

router.get('/points', async (req, res) => {
    const arrayData = await readCsvData();
    res.status(200).json(arrayData);
})

export default router;