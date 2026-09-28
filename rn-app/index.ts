// Background tasks must be registered before anything else: when the OS relaunches the app
// headlessly to deliver locations, no React tree is mounted and only this entry file runs.
import './src/features/tracking/task/location-task';
import 'expo-router/entry';
