import React, { useState, useEffect } from 'react';
import { MapPin, Users, Coffee, ChevronRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const onboardingSteps = [
  {
    icon: MapPin,
    title: "Discover Houston's Coffee Scene",
    description: "Find the best cafes around you—cozy corners, study spots, and local gems waiting to be discovered.",
    insight: "Every great cafe has a story. Let's find yours.",
    emoji: "📍"
  },
  {
    icon: Coffee,
    title: "Share Your Coffee Moments",
    description: "Check in at cafes, share photos, and tag the vibe. Help others discover what makes each spot special.",
    insight: "Your posts help the community find their next favorite cafe.",
    emoji: "☕"
  },
  {
    icon: Users,
    title: "Join the Community",
    description: "See what other Houston coffee lovers are discovering. Real check-ins, real vibes, real recommendations.",
    insight: "More than coffee. More than an app. A community discovering together.",
    emoji: "🤝"
  },
  {
    icon: Heart,
    title: "Track Your Coffee Journey",
    description: "Unlock badges, level up, and build your coffee passport as you explore Houston's cafe scene.",
    insight: "Your username is saved to this device. Accounts coming soon to sync across devices!",
    emoji: "🏆"
  }
];

export default function Onboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      handleNext();
    }
    if (touchStart - touchEnd < -75 && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentCard = onboardingSteps[currentStep];
  const Icon = currentCard.icon;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="w-full h-full max-w-md mx-auto flex flex-col justify-center p-8">
        <div 
          className="flex flex-col space-y-8"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold leading-tight">
              {currentCard.title}
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              {currentCard.description}
            </p>

            {/* Special styling for community card */}
            {currentStep === 2 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                  <Coffee className="w-4 h-4" />
                  <span className="text-sm font-medium">Real People, Real Recommendations</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No algorithms. No ads. Just Houston coffee lovers sharing their favorite spots.
                </p>
              </div>
            )}

            <div className="pt-2 pb-2">
              <p className="text-sm text-muted-foreground/80 leading-relaxed italic">
                💡 {currentCard.insight}
              </p>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-8 bg-primary' 
                    : 'w-2 bg-muted'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full"
              onClick={handleNext}
            >
              {isLastStep ? (
                <>Start Exploring →</>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>

            {!isLastStep && (
              <button
                onClick={onComplete}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}