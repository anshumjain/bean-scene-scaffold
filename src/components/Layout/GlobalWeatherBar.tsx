import { useEffect, useState } from "react";

export function GlobalWeatherBar() {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    // Coffee Puns
    "Bean there, done that ☕",
    "Espresso yourself ☕",
    "Coffee makes everything possible ☕",
    "Life happens, coffee helps ☕",
    "Coffee: because adulting is hard ☕",
    "Rise and grind ☕",
    "Coffee is always a good idea ☕",
    "You can't buy happiness, but you can buy coffee ☕",
    
    // Short Motivational Quotes
    "Start your day with purpose ✨",
    "Every cup tells a story ☕",
    "Small moments, big impact 💫",
    "Find your perfect blend ✨",
    "Coffee first, everything else second ☕",
    "Embrace the journey ☕",
    "Good things take time ☕",
    "Today's brew, tomorrow's dreams ☕",
    
    // Time-based Greetings
    "Good morning, Houston ☕",
    "Afternoon coffee break? ☕", 
    "Evening caffeine fix? ☕",
    "Late night coffee run? ☕",
    
    // Houston-specific
    "Houston, we have coffee ☕",
    "Space City, coffee city ☕",
    "Discover Houston's best ☕",
    "Local coffee, global vibes ☕"
  ];

  useEffect(() => {
    // Set initial message based on time of day
    const hour = new Date().getHours();
    let initialIndex = 0;
    
    if (hour < 12) {
      initialIndex = messages.findIndex(msg => msg.includes("Good morning"));
    } else if (hour < 17) {
      initialIndex = messages.findIndex(msg => msg.includes("Afternoon"));
    } else if (hour < 21) {
      initialIndex = messages.findIndex(msg => msg.includes("Evening"));
    } else {
      initialIndex = messages.findIndex(msg => msg.includes("Late night"));
    }
    
    setMessageIndex(initialIndex);
    setCurrentMessage(messages[initialIndex]);

    // Rotate messages every 8 seconds
    const interval = setInterval(() => {
      setMessageIndex(prev => {
        const nextIndex = (prev + 1) % messages.length;
        setCurrentMessage(messages[nextIndex]);
        return nextIndex;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sticky top-0 z-40 bg-primary/10 backdrop-blur-md border-b border-primary/20">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center">
        <span className="text-sm font-medium text-primary transition-all duration-500 ease-in-out">
          {currentMessage}
        </span>
      </div>
    </div>
  );
}
