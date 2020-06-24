import React, {useState, useEffect} from 'react';
import * as tfvis from '@tensorflow/tfjs-vis';
import axios from 'axios';
import './App.css';

function App() {

  const [points, setPoints] = useState(null);

  useEffect(() => {
    const fetchPointsData = async () => {
      try {
        const data = await axios.get('http://localhost:5000/linear/points');
        setPoints(data.data);
      } catch(e) {

      }
    }; 
    fetchPointsData();
  }, []);

  const plot = (pointsArray, featureName) => {
    tfvis.render.scatterplot(
      { name: `${featureName} vs House Price`},
      { values: [pointsArray], series: ['original']},
      {
        xLabel: featureName,
        yLabel: 'Price'
      }
    )
  };

  useEffect(() => {
    if (points) {
      plot(points, 'Square feet')
    }
  }, [points]);

  return (
    <div className="App">
    </div>
  );
}

export default App;
