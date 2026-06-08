const fs = require('fs');
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
layout = layout.replace('import { ThemeProvider }', 'import { ThemeProvider }\nimport { PrivacyProvider } from "@/components/privacy-provider";');
layout = layout.replace('<AuthProvider>', '<PrivacyProvider>\n            <AuthProvider>');
layout = layout.replace('</AuthProvider>', '</AuthProvider>\n          </PrivacyProvider>');
fs.writeFileSync('src/app/layout.tsx', layout);

let appLayout = fs.readFileSync('src/components/layout/app-layout.tsx', 'utf8');
appLayout = appLayout.replace('import { ThemeToggle }', 'import { ThemeToggle }\nimport { Eye, EyeOff } from "lucide-react";\nimport { usePrivacy } from "@/components/privacy-provider";');
appLayout = appLayout.replace('const { signOut } = useAuth();', 'const { signOut } = useAuth();\n  const { isPrivate, togglePrivacy } = usePrivacy();');
appLayout = appLayout.replace('<ThemeToggle />', '<Button variant="ghost" size="icon" onClick={togglePrivacy} className="text-text-secondary hover:text-foreground">{isPrivate ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</Button>\n          <ThemeToggle />');
fs.writeFileSync('src/components/layout/app-layout.tsx', appLayout);
