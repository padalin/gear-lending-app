// main.jsx
// 強制 Safari（以及其他瀏覽器）套用 .dark
document.documentElement.classList.add('dark');

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import ItemDetail from "./ItemDetail.jsx";
import Success from "./Success.jsx";
import "./index.css";
import MultiBorrowForm from "./MultiBorrowForm.jsx";
import MultiReturnForm from "./MultiReturnForm.jsx";
import Login from "./Login.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminPage from "./AdminPage.jsx";
import NewItemForm from "./NewItemForm.jsx";
import EditItemPage from "./EditItemPage.jsx";
import AdminItemList from "./AdminItemList.jsx";
import TemplateEditorPage from "./pages/TemplateEditorPage.jsx";  // ← 加這行
import { AuthProvider } from "./AuthContext.jsx";
import BulkAddPage from "./BulkAddPage.jsx";
import BulkEditPage from "./BulkEditPage.jsx";
import './styles/global.css';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/bulk-edit" element={<BulkEditPage />} />
          <Route path="/" element={<App />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/borrow" element={<MultiBorrowForm />} />
          <Route path="/return" element={<MultiReturnForm />} />
          <Route path="/success" element={<Success />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/bulk-add" element={<BulkAddPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/items" element={<AdminItemList />} />
          <Route path="/admin/items/new" element={<NewItemForm />} />
          <Route path="/admin/items/edit/:id" element={<EditItemPage />} />
          <Route path="/admin/templates" element={<TemplateEditorPage />} />  {/* ← 新增模板編輯頁路由 */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
