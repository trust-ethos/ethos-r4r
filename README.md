# Ethos Review 4 Review Analyzer

A sophisticated web application for analyzing "Review 4 Review" patterns and reputation farming on the Ethos platform. Built with Deno Fresh, TypeScript, and modern web technologies.

## 🌟 Features

### 🔍 **Advanced Search & Analysis**
- Real-time Ethos profile search with intelligent typeahead
- Comprehensive review statistics dashboard
- Analysis of up to 500 reviews per user for thorough insights

### 🔄 **Reciprocal Review Detection**
- Smart pairing algorithm to identify mutual review relationships
- Visual indicators for "Review 4 Review" patterns
- Time gap analysis between reciprocal reviews

### 📊 **Interactive Network Visualization**
- **GPU-accelerated network graphs** powered by [Cosmograph](https://cosmograph.app/)
- Visual representation of review relationships between users
- Click-to-navigate between user profiles
- Color-coded nodes and edges based on review types and reciprocal status
- Real-time force-directed layout simulation

### 🚨 **R4R Score Algorithm**
- Sophisticated percentage-based penalty system
- Risk assessment: Low (0-39%), Moderate (40-69%), High (70-100%)
- Enhanced detection based on quick reciprocation patterns (<30 minutes)

### 🎨 **Modern Dark UI**
- Sleek dark mode interface
- Responsive design with Tailwind CSS
- Intuitive navigation with clickable user links
- Shareable profile URLs

### 🔗 **Seamless Navigation**
- Direct links to Ethos profiles
- Easy profile-to-profile navigation
- Bookmarkable analysis URLs

## 🚀 Tech Stack

- **Runtime**: Deno
- **Framework**: Fresh (Deno's full-stack web framework)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Preact Signals
- **Network Visualization**: Cosmograph (GPU-accelerated WebGL)
- **APIs**: Ethos Search API (v1) & Activity API (v2)

## 📊 Network Visualization

The interactive network graph shows:

### **Nodes (Users)**
- **Blue**: Central user being analyzed
- **Green**: Users with reciprocal review relationships
- **Gray**: Users with one-way review relationships
- **Size**: Proportional to user importance

### **Edges (Reviews)**
- **Green**: Positive reviews
- **Red**: Negative reviews  
- **Yellow**: Neutral reviews
- **Thickness**: Indicates reciprocal relationships (thicker = mutual)
- **Color intensity**: Based on timing (red = suspicious quick reciprocal)

### **Interactions**
- **Click nodes**: Navigate to user profiles
- **Hover**: View user details
- **Zoom/Pan**: Explore large networks
- **Real-time physics**: GPU-accelerated force simulation

## 🏃‍♂️ Quick Start

### Prerequisites
- [Deno](https://deno.land/) installed on your system

### Development

1. Clone the repository:
```bash
git clone https://github.com/trust-ethos/ethos-r4r.git
cd ethos-r4r
```

2. Start the development server:
```bash
deno task start
```

3. Open your browser and navigate to `http://localhost:8000`

### Production Build

```bash
deno task build
deno task preview
```

## 📊 How It Works

### Review Analysis Process

1. **Search**: Enter any Ethos username to find profiles
2. **Fetch**: Retrieves up to 500 reviews (given and received)
3. **Pair**: Matches reviews between users to identify reciprocal relationships
4. **Analyze**: Calculates farming score based on timing patterns and reciprocal percentage
5. **Display**: Shows comprehensive analysis with risk indicators

### Farming Score Calculation

**Base Score**: `(Reciprocal Reviews ÷ Total Received Reviews) × 100`

**Time-Based Penalties**:
- 80%+ quick reciprocals: +30-50 points (High Risk)
- 60-79% quick reciprocals: +20-35 points 
- 40-59% quick reciprocals: +15-25 points
- 20-39% quick reciprocals: +5-15 points
- <20% quick reciprocals: No penalty

## 🌐 Deployment

### Deno Deploy

This application is optimized for deployment on [Deno Deploy](https://deno.com/deploy):

1. Connect your GitHub repository to Deno Deploy
2. Set the entry point to `main.ts`
3. Deploy from the `deploy` branch
4. No additional configuration needed!

### Environment Variables

No environment variables are required for basic functionality. The app uses public Ethos APIs.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ethos](https://ethos.network/) for providing the reputation platform and APIs
- [Deno](https://deno.land/) team for the excellent runtime and Fresh framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📞 Support

For support, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for the Ethos community**
