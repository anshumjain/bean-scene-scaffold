import React, { useState, useEffect } from 'react';
import { MapPin, Sparkles, Coffee, ChevronRight, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const onboardingSteps = [
  {
    icon: MapPin,
    title: "Discover Cafés Near You",
    description: "Find the best spots around you, cozy corners, local gems, and new favorites.",
    insight: "Your coffee runs could spark unexpected connections.",
    emoji: "📍"
  },
  {
    icon: Sparkles,
    title: "Choose Your Vibe",
    description: "Cozy, laptop-friendly, or lively, pick the space that fits your mood.",
    insight: "Every vibe is an opportunity to focus, relax, or meet someone new.",
    emoji: "✨"
  },
  {
    icon: Coffee,
    title: "More Than Coffee",
    description: "Turn your everyday coffee into something more, catch-ups, co-working, or a friendly hello.",
    insight: "We're creating a culture where real-life interactions happen naturally, one café at a time.",
    emoji: "☕"
  },
  {
    icon: Shield,
    title: "Share Your Coffee Moments",
    description: "Your posts are shared with the community to help others discover great cafes. Your username is tied to this browser for now.",
    insight: "Account system coming soon to sync your posts across devices!",
    emoji: "☕"
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

            {/* Special styling for sharing card */}
            {currentStep === 3 && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <Coffee className="w-4 h-4" />
                  <span className="text-sm font-medium">Community Sharing</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Your posts help others discover amazing cafes. Share your coffee moments and inspire fellow coffee lovers!
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