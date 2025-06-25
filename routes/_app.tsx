import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html class="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ethos R4R Analyzer</title>
        <meta name="description" content="Analyze Ethos review patterns and detect reciprocal review farming with advanced algorithms." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Ethos R4R Analyzer" />
        <meta property="og:description" content="Analyze Ethos review patterns and detect reciprocal review farming with advanced algorithms." />
        <meta property="og:site_name" content="Ethos R4R Analyzer" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Ethos R4R Analyzer" />
        <meta property="twitter:description" content="Analyze Ethos review patterns and detect reciprocal review farming with advanced algorithms." />
        
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-gray-900 text-white">
        <Component />
      </body>
    </html>
  );
}
