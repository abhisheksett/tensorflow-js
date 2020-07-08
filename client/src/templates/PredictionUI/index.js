import React from 'react';

const STATUS_TRAINING = 'Training...';
const STATUS_TRAINED = 'Trained';

const PredictionUI = ({ toggleVisor, train, dataLoaded, trainingStatus, test, testingStatus }) => {
	return (
		<div>
			<div className="section no-pad-bot" id="index-banner">
				<div className="container">
					<h5 className="header center blue-text small">Linear regression with TensorFlow.js</h5>
					<div className="row center">
						<h6 className="header col s12 light">
							Train a model to predict house price from living space.
						</h6>
					</div>
				</div>
			</div>

			{/* Misc buttons */}
			<div className="section no-pad-bot light-blue lighten-4">
				<div className="container">
					<div className="row center">
						<button
							id="toggle-button"
							className="waves-effect waves-light light-blue btn-small"
							onClick={toggleVisor}
						>
							Toggle Visor
						</button>
						<br />
						<br />
					</div>
				</div>
			</div>

			{/* Main functionality */}
			<div className="container">
				<div className="section">
					<div className="row">
						{/* Training */}
						<div className="col s12 m6">
							<div className="icon-block">
								<h3 className="center light-blue-text">
									<i className="material-icons" style={{ fontSize: '2em' }}>
										build
									</i>
								</h3>
								<h5 className="center">Train & Test</h5>

								<p className="light"></p>

								<div>
									<p>
										<label>Training status:</label>
									</p>
									<pre className="grey lighten-4" style={{ 'overflow-x': 'auto' }}>
										<em id="model-status">{trainingStatus}</em>
									</pre>

									<p>
										<label>Testing status:</label>
									</p>
									<pre className="grey lighten-4" style={{ 'overflow-x': 'auto' }}>
										<em id="testing-status">{testingStatus}</em>
									</pre>

									<button
										autocomplete="off"
										id="train-button"
										className="waves-effect light-blue waves-light btn"
										disabled={
											!dataLoaded ||
											trainingStatus === STATUS_TRAINING ||
											trainingStatus.indexOf(STATUS_TRAINED) === 0
										}
										onClick={train}
									>
										Train New Model
									</button>
									<button
										autocomplete="off"
										id="test-button"
										className="waves-effect light-blue waves-light btn"
										disabled={trainingStatus.indexOf(STATUS_TRAINED) !== 0}
										onClick={test}
									>
										Test Model
									</button>
								</div>
								<br />

								<div>
									<button
										autocomplete="off"
										id="load-button"
										className="waves-effect light-blue waves-light btn-small"
										disabled
										onClick="load()"
									>
										Load Model
									</button>
									<button
										autocomplete="off"
										id="save-button"
										className="waves-effect light-blue waves-light btn-small"
										disabled
										onClick="save()"
									>
										Save Model
									</button>
								</div>
							</div>
						</div>

						{/* Prediction */}
						<div className="col s12 m6">
							<div className="icon-block">
								<h3 className="center light-blue-text">
									<i className="material-icons" style={{ 'font-size': '2em' }}>
										timeline
									</i>
								</h3>
								<h5 className="center">Predict</h5>

								<label>
									Square feet of living space:{' '}
									<input type="number" id="prediction-input" placeholder="2000" />
								</label>
								<button
									autocomplete="off"
									id="predict-button"
									className="waves-effect light-blue waves-light btn"
									disabled
									onClick="predict()"
								>
									Predict house price
								</button>
								<p>
									<strong id="prediction-output"></strong>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PredictionUI;
