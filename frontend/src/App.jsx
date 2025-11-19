import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Algorithms from './pages/Algorithms';
import AlgorithmBuilder from './pages/AlgorithmBuilder';
import PaperTrading from './pages/PaperTrading';
import Backtest from './pages/Backtest';
import StockDetail from './pages/StockDetail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/stocks/:symbol" element={<StockDetail />} />
                    <Route path="/algorithms" element={<Algorithms />} />
                    <Route path="/algorithms/:id" element={<AlgorithmBuilder />} />
                    <Route path="/paper-trading" element={<PaperTrading />} />
                    <Route path="/backtest/:algorithmId" element={<Backtest />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
