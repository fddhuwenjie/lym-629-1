import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Requests } from '@/pages/Requests';
import { NewRequest } from '@/pages/NewRequest';
import { RequestDetail } from '@/pages/RequestDetail';
import { Transfers } from '@/pages/Transfers';
import { Borrow } from '@/pages/Borrow';
import { Overdue } from '@/pages/Overdue';
import { Readers } from '@/pages/Readers';
import { ReaderDetail } from '@/pages/ReaderDetail';
import { Export } from '@/pages/Export';
import { Settings } from '@/pages/Settings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/requests"
          element={
            <Layout>
              <Requests />
            </Layout>
          }
        />
        <Route
          path="/requests/new"
          element={
            <Layout>
              <NewRequest />
            </Layout>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <Layout>
              <RequestDetail />
            </Layout>
          }
        />
        <Route
          path="/transfers"
          element={
            <Layout>
              <Transfers />
            </Layout>
          }
        />
        <Route
          path="/borrow"
          element={
            <Layout>
              <Borrow />
            </Layout>
          }
        />
        <Route
          path="/overdue"
          element={
            <Layout>
              <Overdue />
            </Layout>
          }
        />
        <Route
          path="/readers"
          element={
            <Layout>
              <Readers />
            </Layout>
          }
        />
        <Route
          path="/readers/:id"
          element={
            <Layout>
              <ReaderDetail />
            </Layout>
          }
        />
        <Route
          path="/export"
          element={
            <Layout>
              <Export />
            </Layout>
          }
        />
        <Route
          path="/settings"
          element={
            <Layout>
              <Settings />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}
