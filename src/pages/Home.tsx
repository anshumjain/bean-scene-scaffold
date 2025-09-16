import { Coffee } from "lucide-react";
import { AppLayout } from "@/components/Layout/AppLayout";

export default function Home() {
  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center gap-3">
              <Coffee className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">Origins</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 pb-20">
          <section className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Where It Began</h2>
              <p className="text-muted-foreground leading-relaxed">
                Even in a world that's more "connected" than ever, people feel lonely. Screens bridge distances but often leave us isolated in our own cities.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Why Coffee?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Coffee isn't just caffeine. It's comfort. A ritual. A reason to pause. And sometimes, it's the spark that starts a conversation with someone new.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">The Idea</h2>
              <p className="text-muted-foreground leading-relaxed">
                What if meeting new people could be as natural as ordering your favorite drink? Bean Scene is our first step: a discovery app that helps you explore cafés and find the people and vibes waiting there.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">The Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                This is just the beginning. Our bigger goal is to make real-life connections effortless—helping people meet, network, and belong. One café at a time, we're building a culture where connection happens naturally.
              </p>
            </div>

            <div className="text-center pt-6">
              <p className="text-lg font-medium text-primary bg-primary/10 rounded-lg py-3 px-4">
                ✨ More than coffee. More than connections.
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}