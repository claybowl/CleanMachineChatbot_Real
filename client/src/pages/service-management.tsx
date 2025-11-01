import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Service {
  id: number;
  name: string;
  priceRange: string;
  overview: string;
  detailedDescription: string;
  duration: string;
  durationHours: string;
  imageUrl?: string;
}

export default function ServiceManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    priceRange: '',
    overview: '',
    detailedDescription: '',
    duration: '',
    durationHours: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch all services
  const { data: servicesData, isLoading } = useQuery<{ success: boolean; services: Service[] }>({
    queryKey: ['/api/admin/services'],
  });

  const services = servicesData?.services || [];

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // First upload the image if one is selected
      let imageUrl = null;
      if (selectedImage) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedImage);
        const uploadResponse = await fetch('/api/upload-service-image', {
          method: 'POST',
          body: uploadFormData,
        });
        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          imageUrl = uploadResult.imageUrl;
        }
      }

      // Then create the service with the image URL
      return apiRequest('POST', '/api/admin/services', {
        ...formData,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      toast({
        title: 'Service created',
        description: 'The service has been created successfully.',
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service',
        variant: 'destructive',
      });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      // First upload the image if one is selected
      let imageUrl = editingService?.imageUrl;
      if (selectedImage) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedImage);
        const uploadResponse = await fetch('/api/upload-service-image', {
          method: 'POST',
          body: uploadFormData,
        });
        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          imageUrl = uploadResult.imageUrl;
        }
      }

      // Then update the service
      return apiRequest('PUT', `/api/admin/services/${id}`, {
        ...formData,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      toast({
        title: 'Service updated',
        description: 'The service has been updated successfully.',
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update service',
        variant: 'destructive',
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      toast({
        title: 'Service deleted',
        description: 'The service has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete service',
        variant: 'destructive',
      });
    },
  });

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        priceRange: service.priceRange,
        overview: service.overview,
        detailedDescription: service.detailedDescription,
        duration: service.duration,
        durationHours: service.durationHours,
      });
      setImagePreview(service.imageUrl || null);
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        priceRange: '',
        overview: '',
        detailedDescription: '',
        duration: '',
        durationHours: '',
      });
      setImagePreview(null);
    }
    setSelectedImage(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setFormData({
      name: '',
      priceRange: '',
      overview: '',
      detailedDescription: '',
      duration: '',
      durationHours: '',
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      deleteServiceMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Service Management</h1>
            <p className="text-gray-400 mt-2">Manage your service packages and add-ons</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-add-service"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
                <CardHeader>
                  <div className="h-32 bg-gray-800 rounded mb-4"></div>
                  <div className="h-6 bg-gray-800 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-800 rounded mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800 text-center py-12">
            <CardContent>
              <p className="text-gray-400">No services found. Add your first service to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="bg-gray-900 border-gray-800 hover:border-blue-500 transition-colors">
                <CardHeader>
                  {service.imageUrl && (
                    <div className="mb-4 h-32 overflow-hidden rounded-lg">
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardTitle className="text-white">{service.name}</CardTitle>
                  <p className="text-blue-400 font-semibold">{service.priceRange}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm line-clamp-3">{service.overview}</p>
                  <p className="text-gray-400 text-sm mt-2">Duration: {service.duration}</p>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(service)}
                    className="flex-1"
                    data-testid={`button-edit-${service.id}`}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                    data-testid={`button-delete-${service.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="image">Service Image</Label>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer hover:bg-gray-800">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        id="image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                        data-testid="input-service-image"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-service-name"
                />
              </div>

              <div>
                <Label htmlFor="priceRange">Price Range</Label>
                <Input
                  id="priceRange"
                  value={formData.priceRange}
                  onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                  placeholder="e.g., $150-$250"
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-price-range"
                />
              </div>

              <div>
                <Label htmlFor="overview">Overview (Brief Description)</Label>
                <Textarea
                  id="overview"
                  value={formData.overview}
                  onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                  required
                  rows={2}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-overview"
                />
              </div>

              <div>
                <Label htmlFor="detailedDescription">Detailed Description</Label>
                <Textarea
                  id="detailedDescription"
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                  required
                  rows={4}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-detailed-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 2-3 hours"
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-duration"
                  />
                </div>
                <div>
                  <Label htmlFor="durationHours">Duration (Hours)</Label>
                  <Input
                    id="durationHours"
                    type="number"
                    step="0.5"
                    value={formData.durationHours}
                    onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
                    placeholder="e.g., 2.5"
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-duration-hours"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="border-gray-700"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  data-testid="button-save-service"
                >
                  {createServiceMutation.isPending || updateServiceMutation.isPending
                    ? 'Saving...'
                    : editingService
                    ? 'Update Service'
                    : 'Create Service'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
