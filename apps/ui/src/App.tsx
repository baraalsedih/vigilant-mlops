import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Shell from './layout/Shell';
import Overview from './pages/Overview';
import Evaluation from './pages/Evaluation';
import FeatureDrift from './pages/FeatureDrift';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="evaluation" element={<Evaluation />} />
          <Route path="feature-drift" element={<FeatureDrift />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
