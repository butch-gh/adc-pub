import { useState } from 'react'
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobRoleApi, JobRole } from '@/lib/maintenance-api'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'

interface JobRoleFormData {
  name: string
  description: string
}

export function JobRoleList() {
  const queryClient = useQueryClient()

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<JobRole | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<JobRole | null>(null)

  // Form management
  const { control, handleSubmit, reset, formState: { errors } } = useForm<JobRoleFormData>({
    defaultValues: {
      name: '',
      description: ''
    }
  })

  // Efficient data fetching with React Query
  const {
    data: jobRolesData,
    isLoading: isJobRolesLoading,
    error: jobRolesError,
    refetch: refetchJobRoles
  } = useQuery(
    ['job-roles'],
    () => jobRoleApi.getRoles(),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  )

  // Mutations for CRUD operations
  const createRoleMutation = useMutation({
    mutationFn: (data: Omit<JobRole, 'id' | 'created_at' | 'updated_at'>) => jobRoleApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-roles'])
      setIsAddModalOpen(false)
      reset()
      toast.success('Job role created successfully!')
    },
    onError: (error) => {
      console.error('Error creating role:', error)
      toast.error('Failed to create job role')
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<JobRole> }) => jobRoleApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-roles'])
      setIsEditModalOpen(false)
      setEditingRole(null)
      reset()
      toast.success('Job role updated successfully!')
    },
    onError: (error) => {
      console.error('Error updating role:', error)
      toast.error('Failed to update job role')
    }
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => jobRoleApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-roles'])
      setIsDeleteModalOpen(false)
      setRoleToDelete(null)
      toast.success('Job role deleted successfully!')
    },
    onError: (error) => {
      console.error('Error deleting role:', error)
      toast.error('Failed to delete job role')
    }
  })

  // Use the data directly from the query
  const roles = jobRolesData?.data || []
  console.log('Fetched Job Roles:', roles)

  // Handle loading state
  if (isJobRolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading job roles...</span>
        </div>
      </div>
    )
  }

  // Handle error state
  if (jobRolesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg text-red-500 mb-4">Failed to load job roles</div>
          <Button onClick={() => refetchJobRoles()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Handle add role
  const handleAddRole = (data: JobRoleFormData) => {
    if (!data.name.trim()) {
      toast.error('Role name is required')
      return
    }

    // Check for duplicate role name
    const isDuplicate = roles.some(
      role => role.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    )

    if (isDuplicate) {
      toast.error('A role with this name already exists')
      return
    }

    createRoleMutation.mutate({
      name: data.name,
      description: data.description
    })
  }

  // Handle edit role
  const handleEditRole = async (role: JobRole) => {
    try {
      const response = await jobRoleApi.getRole(role.id)
      if (response.success && response.data) {
        const freshRole = response.data
        setEditingRole(freshRole)

        reset({
          name: freshRole.name,
          description: freshRole.description || ''
        })
        setIsEditModalOpen(true)
      } else {
        toast.error('Failed to fetch role details')
      }
    } catch (error) {
      console.error('Error fetching role:', error)
      toast.error('Error fetching role details')
    }
  }

  // Handle update role
  const handleUpdateRole = (data: JobRoleFormData) => {
    if (!editingRole || !data.name.trim()) {
      toast.error('Role name is required')
      return
    }

    // Check for duplicate role name (excluding the current role being edited)
    const isDuplicate = roles.some(
      role => role.id !== editingRole.id && 
              role.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    )

    if (isDuplicate) {
      toast.error('A role with this name already exists')
      return
    }

    updateRoleMutation.mutate({
      id: editingRole.id,
      data: {
        name: data.name,
        description: data.description
      }
    })
  }

  // Handle delete role
  const handleDeleteRole = (role: JobRole) => {
    setRoleToDelete(role)
    setIsDeleteModalOpen(true)
  }

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (!roleToDelete) return
    deleteRoleMutation.mutate(roleToDelete.id)
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Job Roles</h2>
          <p className="text-muted-foreground">
            Manage job positions and role definitions
          </p>
        </div>
        <Button onClick={() => {
          reset({
            name: '',
            description: ''
          })
          setIsAddModalOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      {/* Roles Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No job roles found. Click "Add Role" to create your first role.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {role.updated_at ? new Date(role.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {role.name.toLowerCase() !== 'dentist' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          className="mr-2"
                          disabled={updateRoleMutation.isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
                          className="text-red-600 hover:text-red-700"
                          disabled={deleteRoleMutation.isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Role Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Job Role</DialogTitle>
            <DialogDescription>
              Create a new job role with name and description.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAddRole)} className="space-y-4">
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
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="description"
                    placeholder="Enter role description"
                    {...field}
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRoleMutation.isLoading}>
                {createRoleMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Role'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Job Role</DialogTitle>
            <DialogDescription>
              Update the job role information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpdateRole)} className="space-y-4">
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
              <Label htmlFor="edit-description">Description</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="edit-description"
                    placeholder="Enter role description"
                    {...field}
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRoleMutation.isLoading}>
                {updateRoleMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{roleToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteRoleMutation.isLoading}
            >
              {deleteRoleMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
