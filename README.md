# BeanScene ☕

**Discover cafés, vibes, and connections in Houston**

BeanScene is a Houston coffee discovery app that helps you find the perfect café for your mood, whether you're looking for a quiet study spot, a vibrant social hub, or a cozy date location.

## ✨ Features

### 🏠 **Core Features**
- **Café Discovery**: Find cafes near you with detailed information, photos, and reviews
- **Check-ins**: Share your café experiences with photos, ratings, and tags
- **Favorites**: Save your favorite spots for easy access
- **Feed**: Discover what's happening at cafes around Houston
- **Profile**: Track your café journey and connect with other coffee lovers

### 🎯 **Smart Features**
- **Location-based Search**: Find cafes within walking distance
- **Mood-based Filtering**: Filter by atmosphere (quiet, social, study-friendly, etc.)
- **Real-time Reviews**: See what others are saying about each café
- **Photo Sharing**: Upload and share your café photos
- **Anonymous Mode**: Use the app without creating an account

### 🎨 **Design**
- **Coffee-themed UI**: Beautiful brown and cream color palette
- **Mobile-first**: Optimized for mobile devices
- **Smooth Animations**: Delightful micro-interactions throughout
- **Accessibility**: Built with accessibility in mind

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for database)
- Google Places API key (for café data)
- Cloudinary account (for image storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd bean-scene-scaffold
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```bash
   # Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Google Places API (server-side only)
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   
   # Cloudinary
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_CLOUDINARY_API_KEY=your_cloudinary_api_key
   ```

4. **Set up the database**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Apply migrations
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:8080`

## 🏗️ Tech Stack

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Router** for navigation
- **React Query** for data fetching

### **Backend**
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security (RLS)
- **Supabase Edge Functions** for serverless functions

### **Services**
- **Google Places API** for café data
- **Cloudinary** for image storage and optimization
- **Geolocation API** for location-based features

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Cafe/           # Café-specific components
│   ├── Feed/           # Feed and post components
│   ├── Layout/         # Layout components
│   └── ui/             # shadcn/ui components
├── pages/              # Page components
├── services/           # API and business logic
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── styles/             # Global styles and themes
└── integrations/       # Third-party integrations
```

## 🗄️ Database Schema

### **Core Tables**
- `cafes` - Café information and details
- `posts` - User check-ins and reviews
- `users` - User profiles and preferences
- `favorites` - User's favorite cafes
- `feedback` - User feedback and support requests

### **Features**
- Row Level Security (RLS) for data protection
- Support for both authenticated and anonymous users
- Comprehensive indexing for performance
- Automatic timestamp tracking

## 🚀 Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Other Platforms**
The app can be deployed to any platform that supports:
- Node.js 18+
- Static file serving
- Environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
npm run migrate      # Apply Supabase migrations
npm run seed:reviews # Seed review data
npm run seed:posts   # Seed post data

# Code Quality
npm run lint         # Run ESLint
```

## 🐛 Troubleshooting

### **Common Issues**

1. **Database connection errors**
   - Verify Supabase URL and keys are correct
   - Check if migrations have been applied

2. **Google Places API errors**
   - Ensure API key is valid and has Places API enabled
   - Check API quotas and billing

3. **Image upload issues**
   - Verify Cloudinary credentials
   - Check file size limits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Houston Coffee Community** for inspiration and feedback
- **shadcn/ui** for beautiful UI components
- **Supabase** for the amazing backend platform
- **Vercel** for seamless deployment

---

**Made with ☕ in Houston, TX**