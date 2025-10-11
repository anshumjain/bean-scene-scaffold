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
    title: "Your Identity is Secure",
    description: "Your username is tied to this browser for security. Your posts stay private and no one can access them from another device.",
    insight: "Switching devices won't show your posts here. Account system coming soon for cross-device access!",
    emoji: "🔒"
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

            {/* Special styling for security card */}
            {currentStep === 3 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-medium">Device Security</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Posts created on this device stay here. Account system coming soon to sync across devices!
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