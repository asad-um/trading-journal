const fs = require('fs');

let content = fs.readFileSync('src/components/layout/app-layout.tsx', 'utf8');

// The replacement logic injected state variables INSIDE the return() statement instead of above it.
content = content.replace(
  `  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<string | null>(null);`,
  `  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
`
);

fs.writeFileSync('src/components/layout/app-layout.tsx', content);

