// index.web.js
import { AppRegistry } from 'react-native';
import App from './App'; // Assumes your main component is in App.js

AppRegistry.registerComponent('MyAppName', () => App);

AppRegistry.runApplication('MyAppName', {
  rootTag: document.getElementById('root'),
});