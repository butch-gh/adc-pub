import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { accessPrivilegeGraphQL } from '@/lib/access-privilege-graphql'
import { AccessPrivilege } from '@/lib/maintenance-api'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@repo/auth'

interface PrivilegeFormData {
  selectedLevel: string
  name: string
  accessPermissions: Record<string, boolean>
}

export function AccessPrivilegeList() {
  const { user } = useAuth(); 
  const userRole = user?.role;   
  console.log('Current user role:', userRole);

  const [privileges, setPrivileges] = useState<AccessPrivilege[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingPrivilege, setEditingPrivilege] = useState<AccessPrivilege | null>(null)
  const [privilegeToDelete, setPrivilegeToDelete] = useState<AccessPrivilege | null>(null)

  // Form management
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<PrivilegeFormData>({
    defaultValues: {
      selectedLevel: '',
      name: '',
      accessPermissions: {}
    }
  })

  const watchedLevel = watch('selectedLevel')

  // Form data states - using GraphQL API instead of REST
  const { data: roleLevelsData, isLoading: isRoleLevelsLoading } = useQuery({
    queryKey: ['role-levels'],
    queryFn: () => accessPrivilegeGraphQL.getRoleLevels(),
  })

  const { data: screensData, isLoading: isScreensLoading } = useQuery({
    queryKey: ['screens', watchedLevel, editingPrivilege?.level],
    queryFn: () => accessPrivilegeGraphQL.getScreensByLevel(parseInt(watchedLevel) || editingPrivilege?.level || 1),
    enabled: !!watchedLevel || !!editingPrivilege, // Only fetch when level is selected or editing
  })

  // Transform API data to match expected format
  const roleLevels = roleLevelsData?.data?.map((item: any) => ({
    id: item.level,
    description: item.description
  })) || []

  const screens = screensData?.data || []
  
  
  // Fetch privileges using GraphQL
  const fetchPrivileges = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await accessPrivilegeGraphQL.getPrivileges()
      if (response.success && response.data) {
        console.log('Fetched privileges:', response.data)
        setPrivileges(response.data)
      } else {
        setError('Failed to fetch access privileges')
        toast.error('Failed to fetch access privileges')
      }
    } catch (err) {
      setError('Error fetching access privileges')
      console.error('Error fetching privileges:', err)
      toast.error('Error fetching access privileges')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrivileges()
  }, [])

  
  // Handle add privilege
  const handleAddPrivilege = (data: PrivilegeFormData) => {
    if (!data.name.trim()) {
      toast.error('Role name is required')
      return
    }

    try {
      // For now, we'll use the simple API structure
      // In a full implementation, this would use the complex form data
      const privilegeData = {
        description: data.name,
        level: parseInt(data.selectedLevel) || 1,
        access: JSON.stringify(Object.keys(data.accessPermissions).filter(key => data.accessPermissions[key]))
      }

      accessPrivilegeGraphQL.createPrivilege(privilegeData).then((response) => {
        if (response.success && response.data) {
          // Refetch privileges to get the correct data with proper ID from server
          fetchPrivileges()
          setIsAddModalOpen(false)
          reset()
          toast.success('Access privilege created successfully!')
        } else {
          toast.error('Failed to create access privilege')
        }
      }).catch((err) => {
        console.error('Error creating privilege:', err)
        toast.error('Error creating access privilege')
      })
      
    } catch (err) {
      console.error('Error creating privilege:', err)
      toast.error('Error creating access privilege')
    }
  }

  // Handle edit privilege using GraphQL
  const handleEditPrivilege = async (privilege: AccessPrivilege) => {
    try {
      // Fetch fresh privilege data using getPrivilege GraphQL API
      const response = await accessPrivilegeGraphQL.getPrivilege(privilege.id)
        if (response.success && response.data) {
        const freshPrivilege = response.data
        setEditingPrivilege(freshPrivilege)


        // Parse access from JSON string array to object format
        let parsedPermissions: Record<string, boolean> = {}
        if (freshPrivilege.access) {
          try {
            const permissionsArray = JSON.parse(freshPrivilege.access)

            if (Array.isArray(permissionsArray)) {
              parsedPermissions = permissionsArray.reduce((acc, permission) => {
                acc[permission] = true
                return acc
              }, {} as Record<string, boolean>)
            }
          } catch (error) {
            console.error('Error parsing access:', error)
          }
        }

        reset({
          name: freshPrivilege.description,
          selectedLevel: String(freshPrivilege.level ?? ''),
          accessPermissions: parsedPermissions
        })
        setIsEditModalOpen(true)
      } else {
        toast.error('Failed to fetch privilege details')
      }
    } catch (error) {
      console.error('Error fetching privilege:', error)
      toast.error('Error fetching privilege details')
    }
  }

  // Handle update privilege
  const handleUpdatePrivilege = (data: PrivilegeFormData) => {
    if (!editingPrivilege || !data.name.trim()) {
      toast.error('Role name is required')
      return
    }

    try {
      const privilegeData = {
        description: data.name,
        level: parseInt(data.selectedLevel) || 1,
        access: JSON.stringify(Object.keys(data.accessPermissions).filter(key => data.accessPermissions[key]))
      }

      accessPrivilegeGraphQL.updatePrivilege(editingPrivilege.id, privilegeData).then((response) => {
        if (response.success) {
          // Instead of using response.data, construct the updated privilege from form data
          const updatedPrivilege: AccessPrivilege = {
            ...editingPrivilege,
            description: data.name,
            level: parseInt(data.selectedLevel) || 1,
            access: JSON.stringify(Object.keys(data.accessPermissions).filter(key => data.accessPermissions[key]))
          }
          
          setPrivileges(prev => prev.map(p =>
            p.id === editingPrivilege.id ? updatedPrivilege : p
          ))
          setEditingPrivilege(null)
          setIsEditModalOpen(false)
          reset()
          toast.success('Access privilege updated successfully!')
        } else {
          toast.error('Failed to update access privilege')
        }
      }).catch((err) => {
        console.error('Error updating privilege:', err)
        toast.error('Error updating access privilege')
      })
    } catch (err) {
      console.error('Error updating privilege:', err)
      toast.error('Error updating access privilege')
    }
  }

  // Handle delete privilege
  const handleDeletePrivilege = (privilege: AccessPrivilege) => {
    setPrivilegeToDelete(privilege)
    setIsDeleteModalOpen(true)
  }

  // Handle confirm delete using GraphQL
  const handleConfirmDelete = async () => {
    if (!privilegeToDelete) return

    try {
      const response = await accessPrivilegeGraphQL.deletePrivilege(privilegeToDelete.id)

      if (response.success) {
        setPrivileges(prev => prev.filter(p => p.id !== privilegeToDelete.id))
        setIsDeleteModalOpen(false)
        setPrivilegeToDelete(null)
        toast.success('Access privilege deleted successfully!')
      } else {
        toast.error('Failed to delete access privilege')
      }
    } catch (err) {
      console.error('Error deleting privilege:', err)
      toast.error('Error deleting access privilege')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading access privileges...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg text-red-500 mb-4">{error}</div>
          <Button onClick={fetchPrivileges} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Access Privileges</h2>
          <p className="text-muted-foreground">
            Manage system access levels and permissions
          </p>
        </div>
        <Button onClick={() => {
          reset({
            selectedLevel: '',
            name: '',
            accessPermissions: {}
          })
          setIsAddModalOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Privilege
        </Button>
      </div>

      {/* Privileges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Access Privileges</CardTitle>
          <CardDescription>
            A list of all access privileges in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {privileges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No access privileges found. Click "Add Privilege" to create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                privileges.map((privilege) => (
                  // hide the userRole with 'Admin' and 'superadmin', hide privileges with level 2
                  (userRole !== 'admin' || privilege.level !== 2) &&
                  <TableRow key={privilege.id}>
                    <TableCell className="font-medium">{privilege.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Level {privilege.level}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPrivilege(privilege)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePrivilege(privilege)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Privilege Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Add New Access Privilege</DialogTitle>
            <DialogDescription>
              Create a new access privilege with role level and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAddPrivilege)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Role name is required' }}
                render={({ field }) => (
                  <Input
                    id="name"
                    placeholder="Enter role name"
                    {...field}
                  />
                )}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedLevel">Role Level</Label>
              <Controller
                name="selectedLevel"
                control={control}
                rules={{ required: 'Role level is required' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isRoleLevelsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRoleLevelsLoading ? "Loading..." : "Select role level"} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleLevels
                        .filter((level) => level.id !== undefined && level.id !== null)
                        .map((level) => (
                          <SelectItem key={level.id} value={String(level.id)}>
                            {level.description}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.selectedLevel && (
                <p className="text-sm text-red-500">{errors.selectedLevel.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <h1>Access Permissions</h1>
              {isScreensLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading permissions...</span>
                </div>
              ) : (
                <div className="flex flex-row space-x-8">
                  {/* Appointment */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Appointment</h2>
                    {screens.filter(screen => screen.category==='APPOINTMENT').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  {/* Inventory */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Inventory</h2>
                    {screens.filter(screen => screen.category==='INVENTORY').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                  
                  {/* Billing */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Billing</h2>
                    {screens.filter(screen => screen.category==='BILLING').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  {/* Maintenance */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Maintenance</h2>
                    {screens.filter(screen => screen.category==='MAINTENANCE').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  {screens.length === 0 && !isScreensLoading && (
                    <p className="text-sm text-muted-foreground">Select a role level to see available permissions</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Privilege</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Privilege Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Edit Access Privilege</DialogTitle>
            <DialogDescription>
              Update the access privilege with role level and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpdatePrivilege)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Role name is required' }}
                render={({ field }) => (
                  <Input
                    id="edit-name"
                    placeholder="Enter role name"
                    {...field}
                  />
                )}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-selectedLevel">Role Level</Label>
              <Controller
                name="selectedLevel"
                control={control}
                rules={{ required: 'Role level is required' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isRoleLevelsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRoleLevelsLoading ? "Loading..." : "Select role level"} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleLevels
                        .filter((level) => level.id !== undefined && level.id !== null)
                        .map((level) => (
                          <SelectItem key={level.id} value={String(level.id)}>
                            {level.description}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.selectedLevel && (
                <p className="text-sm text-red-500">{errors.selectedLevel.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <h2>Access Permissions</h2>
              {isScreensLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading permissions...</span>
                </div>
              ) : (
                <div className="flex flex-row space-x-8">
                  {/* Appointment */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Appointment</h2>
                    {screens.filter(screen => screen.category==='APPOINTMENT').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  {/* Inventory */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Inventory</h2>
                    {screens.filter(screen => screen.category==='INVENTORY').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                  
                  {/* Billing */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Billing</h2>
                    {screens.filter(screen => screen.category==='BILLING').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  {/* Maintenance */}
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="font-bold">Maintenance</h2>
                    {screens.filter(screen => screen.category==='MAINTENANCE').map((screen) => (
                      <Controller
                        key={screen.code}
                        name={`accessPermissions.${screen.code}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${screen.code}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`permission-${screen.code}`}>
                              {screen.description}
                            </Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  {screens.length === 0 && !isScreensLoading && (
                    <p className="text-sm text-muted-foreground">Select a role level to see available permissions</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Privilege</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Privilege</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{privilegeToDelete?.description}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
