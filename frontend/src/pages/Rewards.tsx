import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  CircularProgress,
  Paper,
} from '@mui/material';
import { EmojiEvents, EmojiFlags } from '@mui/icons-material';
import { api } from '../services/api';
import { logger } from '../utils/logger';
import { motion } from 'framer-motion';

const StyledDialog = Dialog as any;

interface Reward {
  id: string;
  amount: number;
  description: string;
  claimed: boolean;
  createdAt: string;
}

// Custom HTML5 Canvas Scratch Off Component
const ScratchCard: React.FC<{ reward: Reward; onScratchComplete: () => void }> = ({
  reward,
  onScratchComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scratched, setScratched] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill cover (GPay blue theme)
    ctx.fillStyle = '#0b57d0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scratch pattern
    ctx.fillStyle = '#155fa0';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH ME!', canvas.width / 2, canvas.height / 2);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || scratched) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Check scratch percentage
    checkScratchPercentage();
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentCount = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentCount++;
      }
    }

    const percentage = (transparentCount / (canvas.width * canvas.height)) * 100;
    if (percentage > 50 && !scratched) {
      setScratched(true);
      // Clear completely
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onScratchComplete();
    }
  };

  return (
    <Box sx={{ position: 'relative', width: 180, height: 180, borderRadius: 4, overflow: 'hidden', boxShadow: 3 }}>
      {/* Background showing won amount */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: 'warning.light',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <EmojiEvents sx={{ fontSize: 44, color: 'warning.dark', mb: 1 }} />
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'warning.dark' }}>
          ₹{reward.amount}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Cashback Won!
        </Typography>
      </Box>

      {/* Interactive scratch Canvas overlay */}
      {!scratched && (
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, cursor: 'crosshair' }}
          onMouseDown={() => setIsDrawing(true)}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onMouseMove={draw}
          onTouchStart={() => setIsDrawing(true)}
          onTouchEnd={() => setIsDrawing(false)}
          onTouchMove={draw}
        />
      )}
    </Box>
  );
};

const Rewards: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalCashback, setTotalCashback] = useState(0.0);
  const [isLoading, setIsLoading] = useState(true);

  // Scratch dialog
  const [activeScratch, setActiveScratch] = useState<Reward | null>(null);

  const fetchRewards = async () => {
    try {
      const response = await api.get('/payment/rewards');
      setRewards(response.data.data.rewards);
      setTotalCashback(response.data.data.totalCashback);
    } catch (error) {
      logger.error('Failed to retrieve rewards', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleScratchComplete = () => {
    // Refresh cashbacks directly from Context
    fetchRewards();
  };

  return (
    <Box>
      {/* Rewards Header Dashboard */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #126c36 0%, #34a853 100%)',
          color: 'white',
          borderRadius: 4,
          boxShadow: '0 8px 24 rgba(52, 168, 83, 0.25)',
        }}
      >
        <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              Total Cashback Won
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, my: 1 }}>
              ₹{totalCashback.toFixed(2)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Earn scratch cards for transfers above ₹100!
            </Typography>
          </Box>
          <EmojiEvents sx={{ fontSize: 90, opacity: 0.2, color: 'white' }} />
        </CardContent>
      </Card>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Your Rewards ({rewards.length})
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : rewards.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
          <Typography color="text.secondary">No rewards won yet. Start sending money to win cashback!</Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 3 }}>
          {rewards.map((reward) => (
            <motion.div
              key={reward.id}
              whileHover={{ scale: 1.05 }}
              onClick={() => !reward.claimed && setActiveScratch(reward)}
              style={{ cursor: 'pointer' }}
            >
              <Paper
                sx={{
                  p: 3,
                  height: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  bgcolor: reward.claimed ? 'background.paper' : 'primary.main',
                  color: reward.claimed ? 'text.primary' : 'white',
                  boxShadow: 2,
                  border: `1px solid rgba(0,0,0,0.06)`,
                }}
              >
                {reward.claimed ? (
                  <>
                    <EmojiEvents sx={{ fontSize: 44, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      ₹{reward.amount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5 }}>
                      {reward.description}
                    </Typography>
                  </>
                ) : (
                  <>
                    <EmojiFlags sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      TAP TO SCRATCH
                    </Typography>
                  </>
                )}
              </Paper>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Interactive Scratch Dialog */}
      <StyledDialog
        open={!!activeScratch}
        onClose={() => setActiveScratch(null)}
        PaperProps={{ sx: { borderRadius: 4, p: 2, bgcolor: 'transparent', boxShadow: 'none' } } as any}
      >
        {activeScratch && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ScratchCard reward={activeScratch} onScratchComplete={handleScratchComplete} />
            <Button
              variant="contained"
              onClick={() => setActiveScratch(null)}
              sx={{ mt: 3, bgcolor: 'white', color: 'black', '&:hover': { bgcolor: '#f1f1f1' } }}
            >
              Close Scratch Card
            </Button>
          </Box>
        )}
      </StyledDialog>
    </Box>
  );
};

export default Rewards;
