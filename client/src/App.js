import React, { useState, useEffect, useRef } from 'react';
import * as tfvis from '@tensorflow/tfjs-vis';
import * as tf from '@tensorflow/tfjs';
import axios from 'axios';
import PredictionUI from './templates/PredictionUI';
import './App.css';
import { model } from '@tensorflow/tfjs';

const STATUS_TRAINING = 'Training...';
const STATUS_TRAINED = 'Trained';
const STATUS_SAVED = 'saved';
const STATUS_UNSAVED = 'unsaved';
const storageId = 'kc-house-price-regression';

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
	const [inputValue, setInputValue] = useState('');
	const [predictionValue, setPredictionValue] = useState('');

	const normalisedFeature = useRef();
	const normalisedLabel = useRef();

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

	const plot = (pointsArray, featureName, predictedPointsArray = null) => {
		const values = [pointsArray];
		const series = ['original'];
		if (Array.isArray(predictedPointsArray)) {
			values.push(predictedPointsArray);
			series.push('predicted');
		}
		tfvis.render.scatterplot(
			{ name: `${featureName} vs House Price` },
			{ values, series },
			{
				xLabel: featureName,
				yLabel: 'Price',
			},
		);
	};

	const plotPredictionLine = async () => {
		const [xs, ys] = tf.tidy(() => {
			const normalisedXs = tf.linspace(0, 1, 100);
			const normalisedYs = globalModel.predict(normalisedXs.reshape([100, 1]));

			const xs = denormalise(
				normalisedXs,
				normalisedFeature.current.min,
				normalisedFeature.current.max,
			);
			const ys = denormalise(
				normalisedYs,
				normalisedLabel.current.min,
				normalisedLabel.current.max,
			);

			return [xs.dataSync(), ys.dataSync()];
		});

		const predictionPoints = Array.from(xs).map((val, index) => {
			return { x: val, y: ys[index] };
		});

		await plot(points, 'Square feet', predictionPoints);
	};

	const normalise = (tensor, previousMin = null, previousMax = null) => {
		const min = previousMin || tensor.min();
		const max = previousMax || tensor.max();
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

	const predict = async () => {
		const predictionInput = parseInt(inputValue);
		if (isNaN(predictionInput)) {
			alert('Please enter a valid number');
		} else {
			tf.tidy(() => {
				const inputTensor = tf.tensor1d([predictionInput]);
				const normalisedInput = normalise(
					inputTensor,
					normalisedFeature.current.min,
					normalisedFeature.current.max,
				);
				const normalisedOutputTensor = globalModel.predict(normalisedInput.tensor);
				const outputTensor = denormalise(
					normalisedOutputTensor,
					normalisedLabel.current.min,
					normalisedLabel.current.max,
				);
				const outputValue = outputTensor.dataSync()[0];
				const outputValueRounded = (outputValue / 1000).toFixed(0) * 1000;
				setPredictionValue(`The predicted house price is $${outputValueRounded}`);
			});
		}
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

	const save = async () => {
		const saveResult = await globalModel.save(`localstorage://${storageId}`);
		setTrainingStatus(
			`${STATUS_TRAINED} (${STATUS_SAVED}) ${saveResult.modelArtifactsInfo.dateSaved}`,
		);
	};

	const load = async () => {
		const storageKey = `localstorage://${storageId}`;
		const models = await tf.io.listModels();
		const modelInfo = models[storageKey];
		if (modelInfo) {
			const fetchedModel = await tf.loadLayersModel(storageKey);
			setGlobalModel(fetchedModel);
			setTrainingStatus(`${STATUS_TRAINED} (${STATUS_SAVED}) ${modelInfo.dateSaved}`);
		} else {
			alert('No model to load');
		}
	};

	const test = async () => {
		const lostTensor = globalModel.evaluate(testingFeatureTensor, testingLabelTensor);
		const loss = await lostTensor.dataSync();
		console.log(loss[0]);
		setTestingStatus(`Testing set loss: ${loss[0].toPrecision(5)}`);
	};

	useEffect(() => {
		const showVis = async () => {
			if (globalModel) {
				tfvis.show.modelSummary({ name: 'Model summary' }, globalModel);
				const layers = globalModel.getLayer(undefined, 0);
				tfvis.show.layer({ name: 'Layer 1' }, layers);
				await plotPredictionLine();
			}
		};
		showVis();
	}, [globalModel]);

	const train = async () => {
		setTrainingStatus(STATUS_TRAINING);
		toggleVisor();
		const model = createModel();
		setGlobalModel(model);

		const result = await trainModel(model, trainingFeatureTensor, trainingLabelTensor);
		const trainingLoss = result.history.loss.pop();
		console.log(`Training set loss: ${trainingLoss}`);
		const validationLoss = result.history.val_loss.pop();
		console.log(`Validation set loss: ${validationLoss}, ${typeof validationLoss}`);

		setTrainingStatus(`${STATUS_TRAINED} (${STATUS_UNSAVED})
		Loss: ${trainingLoss.toPrecision(5)}
		Validation loss: ${validationLoss.toPrecision(5)}`);
		await plotPredictionLine();
	};

	const inputChange = (e) => {
		setInputValue(e.target.value);
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

					normalisedFeature.current = normalise(featureTensor);
					normalisedLabel.current = normalise(labelTensor);

					featureTensor.dispose();
					labelTensor.dispose();

					const [tempTrainingFeatureTensor, tempTestingFeatureTensor] = tf.split(
						normalisedFeature.current.tensor,
						2,
					);

					setTrainingFeatureTensor(tempTrainingFeatureTensor);
					setTestingFeatureTensor(tempTestingFeatureTensor);

					const [tempTrainingLabelTensor, tempTestingLabelTensor] = tf.split(
						normalisedLabel.current.tensor,
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
				save={save}
				load={load}
				inputValue={inputValue}
				inputChange={inputChange}
				predictionValue={predictionValue}
				predict={predict}
			/>
		</div>
	);
}

export default App;
