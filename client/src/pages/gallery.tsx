import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

interface Photo {
  id: string;
  photoUrl: string;
  photoReference: string;
  width: number;
  height: number;
  attribution?: string;
  date?: string;
}

const GalleryPage: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch photos from Google Place API 
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        
        // Try to fetch photos from Google Business Profile API
        const response = await fetch('/api/google-business-photos');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.photos && data.photos.length > 0) {
            setPhotos(data.photos);
            setLoading(false);
            return;
          }
        }
        
        // Fallback to local gallery photos
        const { mockGalleryPhotos } = await import('@/data/galleryPhotos');
        setPhotos(mockGalleryPhotos);
      } catch (err) {
        console.error('Error fetching photos:', err);
        // Load local photos as fallback
        const { mockGalleryPhotos } = await import('@/data/galleryPhotos');
        setPhotos(mockGalleryPhotos);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-black to-blue-950 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <Button 
              variant="ghost" 
              className="text-blue-300 hover:text-blue-100 hover:bg-blue-800/30 mb-2"
              asChild
              data-testid="button-back-home"
            >
              <Link href="/">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-100">
              Our Work Gallery
            </h1>
            <p className="text-blue-300">
              See the difference our premium detailing services make on real client vehicles
            </p>
          </div>
          
          <div className="flex flex-col gap-2 md:mt-8">
            <Button 
              variant="outline" 
              className="border-blue-500 text-blue-300 hover:bg-blue-950/50"
              asChild
              data-testid="button-view-google-photos"
            >
              <a 
                href="https://g.page/r/CQo53O2yXrN8EAE" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                View More on Google
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          </div>
        </div>

        {loading ? (
          // Loading state with skeletons
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-blue-900/20 border-blue-800/50 overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="w-full h-64 bg-blue-800/20" />
                  <div className="p-4">
                    <Skeleton className="w-1/2 h-5 bg-blue-800/20 mb-2" />
                    <Skeleton className="w-full h-4 bg-blue-800/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 mx-auto text-blue-400 opacity-50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Couldn't Load Gallery</h3>
            <p className="text-blue-300 mb-6">{error}</p>
            <p className="text-blue-400 italic">
              We're working on connecting our business photos. In the meantime, please check out our work on the 
              <Button 
                variant="link" 
                className="text-blue-300 hover:text-blue-100 px-1"
                onClick={() => window.open('https://g.page/r/CQo53O2yXrN8EAE', '_blank')}
              >
                Google Business Profile <ExternalLink className="h-3 w-3 inline" />
              </Button>
            </p>
          </div>
        ) : photos.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 mx-auto text-blue-400 opacity-50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Photos Available</h3>
            <p className="text-blue-300 mb-6">Check back soon to see our latest work</p>
            <p className="text-blue-400 italic">
              Meanwhile, you can see our work on our 
              <Button 
                variant="link" 
                className="text-blue-300 hover:text-blue-100 px-1"
                onClick={() => window.open('https://g.page/r/CQo53O2yXrN8EAE', '_blank')}
              >
                Google Business Profile <ExternalLink className="h-3 w-3 inline" />
              </Button>
            </p>
          </div>
        ) : (
          // Gallery grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="bg-blue-900/20 border-blue-800/50 overflow-hidden h-full transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1">
                  <CardContent className="p-0 relative h-full flex flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={photo.photoUrl} 
                        alt={`Clean Machine Auto Detail work ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    </div>
                    {photo.attribution && (
                      <div className="p-4 mt-auto">
                        <p className="text-sm text-gray-300">{photo.attribution}</p>
                        {photo.date && (
                          <p className="text-xs text-gray-400 mt-1">{photo.date}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryPage;