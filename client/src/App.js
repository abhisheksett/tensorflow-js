import React, { useState, useEffect } from 'react';
import * as tfvis from '@tensorflow/tfjs-vis';
import * as tf from '@tensorflow/tfjs';
import axios from 'axios';
import PredictionUI from './templates/PredictionUI';
import './App.css';

const STATUS_TRAINING = 'Training...';
const STATUS_TRAINED = 'Trained';

function App() {
	const [points, setPoints] = useState(null);
	const [trainingFeatureTensor, setTrainingFeatureTensor] = useState(null);
	const [trainingLabelTensor, setTrainingLabelTensor] = useState(null);
	const [testingFeatureTensor, setTestingFeatureTensor] = useState(null);
	const [testingLabelTensor, setTestingLabelTensor] = useState(null);
	const [dataLoaded, setDataLoaded] = useState(false);
	const [trainingStatus, setTrainingStatus] = useState('Loading data...');
	const [testingStatus, setTestingStatus] = useState('Not yet tested');
	const [globalModel, setGlobalModel] = useState(null);

	useEffect(() => {
		tfvis.visor().close();
		const fetchPointsData = async () => {
			try {
				const data = await axios.get('http://localhost:5000/linear/points');
				setPoints(data.data);
			} catch (e) {}
		};
		fetchPointsData();
	}, []);

	const plot = (pointsArray, featureName) => {
		tfvis.render.scatterplot(
			{ name: `${featureName} vs House Price` },
			{ values: [pointsArray], series: ['original'] },
			{
				xLabel: featureName,
				yLabel: 'Price',
			},
		);
	};

	const normalise = (tensor) => {
		const min = tensor.min();
		const max = tensor.max();
		const normalisedTensor = tensor.sub(min).div(max.sub(min));
		return {
			tensor: normalisedTensor,
			min,
			max,
		};
	};

	const denormalise = (tensor, min, max) => {
		const denormalisedTensor = tensor.mul(max.sub(min)).add(min);
		return denormalisedTensor;
	};

	const createModel = () => {
		const model = tf.sequential();

		model.add(
			tf.layers.dense({
				units: 1,
				useBias: true,
				activation: 'linear',
				inputDim: 1,
			}),
		);

		const optimizer = tf.train.sgd(0.1);

		model.compile({
			loss: 'meanSquaredError',
			optimizer,
		});

		return model;
	};

	const trainModel = async (model, x, y) => {
		const { onBatchEnd, onEpochEnd } = tfvis.show.fitCallbacks({ name: 'Training performance' }, [
			'loss',
		]);

		return model.fit(x, y, {
			batchSize: 32,
			epochs: 20,
			validationSplit: 0.2,
			callbacks: {
				onEpochEnd,
				// onBatchEnd,
			},
		});
	};

	const toggleVisor = () => {
		tfvis.visor().toggle();
	};

	const test = async () => {
		const lostTensor = globalModel.evaluate(testingFeatureTensor, testingLabelTensor);
		const loss = await lostTensor.dataSync();
		console.log(loss[0]);
		setTestingStatus(`Testing set loss: ${loss[0].toPrecision(5)}`);
	};

	const train = async () => {
		setTrainingStatus(STATUS_TRAINING);
		toggleVisor();
		const model = createModel();
		setGlobalModel(model);
		tfvis.show.modelSummary({ name: 'Model summary' }, model);

		const layers = model.getLayer(undefined, 0);
		tfvis.show.layer({ name: 'Layer 1' }, layers);

		const result = await trainModel(model, trainingFeatureTensor, trainingLabelTensor);
		const trainingLoss = result.history.loss.pop();
		console.log(`Training set loss: ${trainingLoss}`);
		const validationLoss = result.history.val_loss.pop();
		console.log(`Validation set loss: ${validationLoss}, ${typeof validationLoss}`);

		setTrainingStatus(`${STATUS_TRAINED} (unsaved)
		Loss: ${trainingLoss.toPrecision(5)}
		Validation loss: ${validationLoss.toPrecision(5)}`);
	};

	useEffect(() => {
		const initiatePlot = async () => {
			try {
				if (points) {
					if (points % 2 !== 0) {
						points.pop();
					}
					tf.util.shuffle(points);
					plot(points, 'Square feet');

					// Features (input)
					const featureValues = await points.map((p) => p.x);
					const featureTensor = tf.tensor2d(featureValues, [featureValues.length, 1]);

					// Labels (output)
					const labelValues = await points.map((p) => p.y);
					const labelTensor = tf.tensor2d(labelValues, [labelValues.length, 1]);

					const normalisedFeature = normalise(featureTensor);
					const normalisedLabel = normalise(labelTensor);

					featureTensor.dispose();
					labelTensor.dispose();

					const [tempTrainingFeatureTensor, tempTestingFeatureTensor] = tf.split(
						normalisedFeature.tensor,
						2,
					);

					setTrainingFeatureTensor(tempTrainingFeatureTensor);
					setTestingFeatureTensor(tempTestingFeatureTensor);

					const [tempTrainingLabelTensor, tempTestingLabelTensor] = tf.split(
						normalisedLabel.tensor,
						2,
					);
					setTrainingLabelTensor(tempTrainingLabelTensor);
					setTestingLabelTensor(tempTestingLabelTensor);

					setDataLoaded(true);
					setTrainingStatus('No model trained');
				}
			} catch (e) {
				console.log(e);
			}
		};
		initiatePlot();
	}, [points]);

	return (
		<div className="App">
			<PredictionUI
				toggleVisor={toggleVisor}
				train={train}
				dataLoaded={dataLoaded}
				trainingStatus={trainingStatus}
				test={test}
				testingStatus={testingStatus}
			/>
		</div>
	);
}

export default App;
