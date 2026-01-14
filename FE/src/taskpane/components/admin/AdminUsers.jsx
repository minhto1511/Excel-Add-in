import * as React from "react";
import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Input,
  Dropdown,
  Option,
  Badge,
  Button,
  Spinner,
} from "@fluentui/react-components";
import { Search24Regular, ArrowSync24Regular } from "@fluentui/react-icons";
import { getAdminUsers } from "../../../services/apiService";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, [page, plan]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryPlan = plan === "all" ? "" : plan;
      const res = await getAdminUsers(page, 20, search, queryPlan);
      setUsers(res.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case "pro":
        return (
          <Badge appearance="filled" color="brand">
            PRO
          </Badge>
        );
      default:
        return <Badge appearance="outline">FREE</Badge>;
    }
  };

  return (
    <div className="admin-users">
      <div className="table-controls">
        <Input
          placeholder="Tìm theo email hoặc tên..."
          contentBefore={<Search24Regular />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
        />
        <Dropdown
          placeholder="Gói dịch vụ"
          value={plan}
          onOptionSelect={(e, data) => setPlan(data.optionValue)}
        >
          <Option value="all">Tất cả</Option>
          <Option value="free">FREE</Option>
          <Option value="pro">PRO</Option>
        </Dropdown>
        <Button icon={<ArrowSync24Regular />} onClick={fetchUsers} />
      </div>

      <div className="table-scroll-container">
        <Table size="small">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Tên</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Gói</TableHeaderCell>
              <TableHeaderCell>Hết hạn</TableHeaderCell>
              <TableHeaderCell>Trạng thái</TableHeaderCell>
              <TableHeaderCell>Ngày tham gia</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colspan={6} style={{ textAlign: "center", padding: "40px" }}>
                  <Spinner label="Đang tải người dùng..." />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colspan={6} style={{ textAlign: "center", padding: "40px" }}>
                  Không tìm thấy người dùng nào
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getPlanBadge(user.subscription?.plan)}</TableCell>
                  <TableCell>
                    {user.subscription?.endDate
                      ? new Date(user.subscription.endDate).toLocaleDateString("vi-VN")
                      : "---"}
                  </TableCell>
                  <TableCell>
                    <Badge appearance="tint" color={user.isActive ? "success" : "danger"}>
                      {user.isActive ? "Active" : "Blocked"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
