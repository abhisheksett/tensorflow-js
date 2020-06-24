import express from 'express';
import cors from 'cors';
import linearRegression from './routes/linear-regression';

const app = express();
app.use(cors());
const router = express.Router();

app.use('/linear', linearRegression);

app.listen(5000, () => {
    console.log('server started'); 
})




