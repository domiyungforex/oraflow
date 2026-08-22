"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useUser } from "@clerk/nextjs";
import { useBusinessMembers, useInviteMember } from "@/hooks/use-api";
import { Search, UserPlus, Shield, Mail } from "lucide-react";

const roleLabels: Record<string, string> = {
  BUSINESS_OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

const roleColors: Record<string, string> = {
  BUSINESS_OWNER: "bg-purple-100 text-purple-800",
  MANAGER: "bg-blue-100 text-blue-800",
  STAFF: "bg-gray-100 text-gray-800",
};

export default function TeamPage() {
  const { user } = useUser();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");

  const { data: membersData, isLoading } = useBusinessMembers();
  const inviteMember = useInviteMember();

  const members = membersData?.data || [];
  const activeMembers = members.filter((m: any) => m.isActive);
  const pendingMembers = members.filter((m: any) => !m.isActive);

  const handleInvite = async () => {
    if (!inviteEmail) return;

    try {
      await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      setInviteRole("STAFF");
      setShowInviteForm(false);
    } catch (error) {
      console.error("Failed to invite member:", error);
    }
  };

  return (
    <DashboardLayout
      title="Team"
      description="Manage your team members and permissions"
      actions={
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Invites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMembers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Send an invitation to join your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="w-40 space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
              <Button onClick={handleInvite} disabled={inviteMember.isPending}>
                <Mail className="h-4 w-4 mr-2" />
                {inviteMember.isPending ? "Sending..." : "Send Invite"}
              </Button>
              <Button variant="ghost" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </div>
            {inviteMember.isError && (
              <p className="text-sm text-red-600 mt-2">
                Failed to send invitation. Please try again.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search team members..." className="pl-9" />
        </div>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 skeleton rounded" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg mb-2">No team members yet</p>
              <p className="text-sm">Invite your first team member to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: any) => {
                  const memberUser = member.user;
                  const isCurrentUser = memberUser?.email === user?.emailAddresses?.[0]?.emailAddress;

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {memberUser?.firstName && memberUser?.lastName
                                ? `${memberUser.firstName[0]}${memberUser.lastName[0]}`
                                : memberUser?.email?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {memberUser?.firstName && memberUser?.lastName
                                ? `${memberUser.firstName} ${memberUser.lastName}`
                                : memberUser?.email || "Unknown"}
                              {isCurrentUser && (
                                <span className="text-xs text-muted-foreground ml-2">(You)</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {memberUser?.email || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[member.role] || ""}>
                          <Shield className="h-3 w-3 mr-1" />
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "success" : "warning"}>
                          {member.isActive ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.acceptedAt
                          ? new Date(member.acceptedAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Invited"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          •••
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>What each role can do in your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-100 text-purple-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Owner
                </Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full access to all features</li>
                <li>• Manage team members</li>
                <li>• Billing & subscription</li>
                <li>• Delete business</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Manager
                </Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage orders & products</li>
                <li>• View analytics</li>
                <li>• Manage inventory</li>
                <li>• Cannot manage team</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-gray-100 text-gray-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Staff
                </Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View orders</li>
                <li>• Update order status</li>
                <li>• View products</li>
                <li>• Cannot manage settings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
