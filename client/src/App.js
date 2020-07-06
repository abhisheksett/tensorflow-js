import React, { useState, useEffect } from 'react';
import * as tfvis from '@tensorflow/tfjs-vis';
import * as tf from '@tensorflow/tfjs';
import axios from 'axios';
import './App.css';

function App() {
	const [points, setPoints] = useState(null);

	useEffect(() => {
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

					const [trainingFeatureTensor, testingFeatureTensor] = tf.split(
						normalisedFeature.tensor,
						2,
					);

					const [trainingLabelTensor, testingLabelTensor] = tf.split(normalisedLabel.tensor, 2);
					// denormalise(
					// 	normalisedFeature.tensor,
					// 	normalisedFeature.min,
					// 	normalisedFeature.max,
					// ).print();
				}
			} catch (e) {
				console.log(e);
			}
		};
		initiatePlot();
	}, [points]);

	return <div className="App"></div>;
}

export default App;
