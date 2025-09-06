"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  createMatchingPool, 
  getMatchingPools, 
  updateMatchingPool,
  addCausesToMatchingPool,
  removeCausesFromMatchingPool,
  getMatchingPoolById,
  type MatchingPool 
} from "@/actions/matching-pool-actions";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign, Users, Calendar, RefreshCw } from "lucide-react";

export function MatchingPoolManager() {
  const [pools, setPools] = useState<MatchingPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<MatchingPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPool, setEditingPool] = useState<MatchingPool | null>(null);
  const [showAddCauses, setShowAddCauses] = useState<string | null>(null);
  const [newCauseId, setNewCauseId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form state for creating/editing pools
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_amount: "",
    matching_ratio: "0.2", // 1:5 ratio
    start_date: "",
    end_date: "",
    cause_ids: [] as string[],
  });

  // Load matching pools on component mount
  useEffect(() => {
    loadMatchingPools();
    
    // Refresh data every 5 seconds to show real-time updates
    const interval = setInterval(loadMatchingPools, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadMatchingPools = async (showToast = false) => {
    try {
      setLoading(true);
      const data = await getMatchingPools();
      setPools(data);
      setLastUpdated(new Date());
      
      if (showToast) {
        toast({
          title: "Success",
          description: "Matching pools data refreshed",
        });
      }
    } catch (error) {
      console.error("Error loading matching pools:", error);
      toast({
        title: "Error",
        description: "Failed to load matching pools",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    try {
      setLoading(true);
      
      const poolData = {
        name: formData.name,
        description: formData.description || undefined,
        total_amount: parseFloat(formData.total_amount),
        matching_ratio: parseFloat(formData.matching_ratio),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        cause_ids: formData.cause_ids,
      };

      const result = await createMatchingPool(poolData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Matching pool created successfully",
        });
        setFormData({
          name: "",
          description: "",
          total_amount: "",
          matching_ratio: "0.2",
          start_date: "",
          end_date: "",
          cause_ids: [],
        });
        loadMatchingPools();
        setActiveTab("overview");
      }
    } catch (error) {
      console.error("Error creating matching pool:", error);
      toast({
        title: "Error",
        description: "Failed to create matching pool",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePoolStatus = async (poolId: string, isActive: boolean) => {
    try {
      setLoading(true);
      const result = await updateMatchingPool(poolId, { is_active: !isActive });
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Matching pool ${isActive ? 'deactivated' : 'activated'}`,
        });
        loadMatchingPools();
      }
    } catch (error) {
      console.error("Error updating pool status:", error);
      toast({
        title: "Error",
        description: "Failed to update pool status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPool = (pool: MatchingPool) => {
    setEditingPool(pool);
    setFormData({
      name: pool.name,
      description: pool.description || "",
      total_amount: pool.total_amount.toString(),
      matching_ratio: pool.matching_ratio.toString(),
      start_date: pool.start_date ? new Date(pool.start_date).toISOString().slice(0, 16) : "",
      end_date: pool.end_date ? new Date(pool.end_date).toISOString().slice(0, 16) : "",
      cause_ids: [],
    });
    setActiveTab("create");
  };

  const handleUpdatePool = async () => {
    if (!editingPool) return;
    
    try {
      setLoading(true);
      const result = await updateMatchingPool(editingPool.id, {
        name: formData.name,
        description: formData.description || undefined,
        total_amount: parseFloat(formData.total_amount),
        matching_ratio: parseFloat(formData.matching_ratio),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Matching pool updated successfully",
        });
        setEditingPool(null);
        setFormData({
          name: "",
          description: "",
          total_amount: "",
          matching_ratio: "0.2",
          start_date: "",
          end_date: "",
          cause_ids: [],
        });
        loadMatchingPools();
        setActiveTab("overview");
      }
    } catch (error) {
      console.error("Error updating matching pool:", error);
      toast({
        title: "Error",
        description: "Failed to update matching pool",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCauseToPool = async (poolId: string) => {
    if (!newCauseId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a cause ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await addCausesToMatchingPool(poolId, [newCauseId.trim()]);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Cause added to matching pool",
        });
        setNewCauseId("");
        setShowAddCauses(null);
        loadMatchingPools();
      }
    } catch (error) {
      console.error("Error adding cause to pool:", error);
      toast({
        title: "Error",
        description: "Failed to add cause to pool",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatRatio = (ratio: number) => {
    return `1:${Math.round(1 / ratio)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Matching Pool Manager</h2>
          <p className="text-gray-600">Manage donation matching pools and incentives</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => loadMatchingPools(true)} 
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setActiveTab("create")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Pool
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create Pool</TabsTrigger>
          <TabsTrigger value="manage">Manage Pools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pools.length}</div>
                <p className="text-xs text-muted-foreground">
                  {pools.filter(p => p.is_active).length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pool Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(pools.reduce((sum, pool) => sum + pool.total_amount, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(pools.reduce((sum, pool) => sum + pool.remaining_amount, 0))} remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Matched</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(pools.reduce((sum, pool) => sum + (pool.total_amount - pool.remaining_amount), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Donations matched
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Matching Pools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pools.slice(0, 6).map((pool) => (
                <Card key={pool.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pool.name}</CardTitle>
                      <Badge variant={pool.is_active ? "default" : "secondary"}>
                        {pool.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{pool.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Amount:</span>
                      <span className="font-medium">{formatCurrency(pool.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Remaining:</span>
                      <span className="font-medium">{formatCurrency(pool.remaining_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Matching Ratio:</span>
                      <span className="font-medium">{formatRatio(pool.matching_ratio)}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress:</span>
                        <span className="font-medium">
                          {pool.total_amount && pool.total_amount > 0 
                            ? Math.round(((pool.total_amount - pool.remaining_amount) / pool.total_amount) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={pool.total_amount && pool.total_amount > 0 
                          ? Math.round(((pool.total_amount - pool.remaining_amount) / pool.total_amount) * 100)
                          : 0
                        } 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingPool ? "Edit Matching Pool" : "Create New Matching Pool"}
              </CardTitle>
              <CardDescription>
                {editingPool 
                  ? "Update the matching pool settings"
                  : "Set up a new matching pool to incentivize donations for specific causes"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Pool Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Education Matching Pool"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount (NGN)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    placeholder="100000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this matching pool..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matching_ratio">Matching Ratio</Label>
                  <Select
                    value={formData.matching_ratio}
                    onValueChange={(value) => setFormData({ ...formData, matching_ratio: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.1">1:10 (10%)</SelectItem>
                      <SelectItem value="0.2">1:5 (20%)</SelectItem>
                      <SelectItem value="0.5">1:2 (50%)</SelectItem>
                      <SelectItem value="1.0">1:1 (100%)</SelectItem>
                      <SelectItem value="2.0">2:1 (200%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date (Optional)</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveTab("overview");
                    setEditingPool(null);
                    setFormData({
                      name: "",
                      description: "",
                      total_amount: "",
                      matching_ratio: "0.2",
                      start_date: "",
                      end_date: "",
                      cause_ids: [],
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={editingPool ? handleUpdatePool : handleCreatePool} 
                  disabled={loading}
                >
                  {loading 
                    ? (editingPool ? "Updating..." : "Creating...") 
                    : (editingPool ? "Update Pool" : "Create Pool")
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">All Matching Pools</h3>
            <div className="space-y-4">
              {pools.map((pool) => (
                <Card key={pool.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{pool.name}</CardTitle>
                        <CardDescription>{pool.description}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={pool.is_active ? "default" : "secondary"}>
                          {pool.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPool(pool)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddCauses(showAddCauses === pool.id ? null : pool.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Cause
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePoolStatus(pool.id, pool.is_active)}
                        >
                          {pool.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span>
                        <p className="font-medium">{formatCurrency(pool.total_amount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining:</span>
                        <p className="font-medium">{formatCurrency(pool.remaining_amount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Matching Ratio:</span>
                        <p className="font-medium">{formatRatio(pool.matching_ratio)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progress:</span>
                        <p className="font-medium">
                          {pool.total_amount && pool.total_amount > 0 
                            ? Math.round(((pool.total_amount - pool.remaining_amount) / pool.total_amount) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Add Cause Form */}
                    {showAddCauses === pool.id && (
                      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-medium mb-2">Add Cause to Pool</h4>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter Cause ID (e.g., a1b2c3d4-e5f6-4789-8bcd-ef1234567890)"
                            value={newCauseId}
                            onChange={(e) => setNewCauseId(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddCauseToPool(pool.id)}
                            disabled={loading}
                          >
                            {loading ? "Adding..." : "Add"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowAddCauses(null);
                              setNewCauseId("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          You can find the Cause ID in the URL when viewing a cause page
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
