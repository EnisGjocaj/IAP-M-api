import puppeteer from 'puppeteer';

interface GradeScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface GradeEntry {
  number?: string;
  code?: string;
  subject?: string;
  professor?: string;
  grade?: string;
  credits?: string;
  semester?: string;
}

export class GradesService {
  async scrapeGrades(username: string, password: string): Promise<GradeScrapingResult> {
    try {
      console.log('Starting grade scraping process...');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Enable console logging from the page
      page.on('console', msg => console.log('Browser console:', msg.text()));

      console.log('Navigating to login page...');
      await page.goto('https://smu.unhz.eu/Account/Login', {
        waitUntil: 'networkidle0'
      });

      // Take screenshot of login page
      await page.screenshot({ path: 'login-page.png' });

      console.log('Filling login form...');
      await page.type('input[name="userName"]', username);
      await page.type('input[name="loginPassword"]', password);

      console.log('Attempting login...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button#LoginId')
      ]);

      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);
      
      if (currentUrl.includes('Login')) {
        throw new Error('Login failed - still on login page');
      }

      console.log('Navigating to transcript page...');
      await page.goto('https://smu.unhz.eu/TranskriptaNotave', {
        waitUntil: 'networkidle0'
      });

      // Take screenshot of transcript page
      await page.screenshot({ path: 'transcript-page.png' });

      console.log('Extracting grades data...');
      const { gradesData, summary, debug } = await page.evaluate(() => {
        const grades: GradeEntry[] = [];
        const summary: Record<string, string> = {};
        const debug = {
          tableCount: document.querySelectorAll('table').length,
          borderedTableCount: document.querySelectorAll('table.table-bordered').length,
          htmlContent: document.documentElement.innerHTML
        };
        
        // Try different table selectors
        const tables = document.querySelectorAll('table');
        let mainTable = null as any;
        
        // Find the table that looks like a grades table
        tables.forEach((table, index) => {
          const rows = table.querySelectorAll('tr');
          if (rows.length > 1) { // More than just header
            const firstDataRow = rows[1];
            const cells = firstDataRow.querySelectorAll('td');
            if (cells.length >= 4) { // Has enough columns
              mainTable = table as any;
              console.log(`Found main table at index ${index}`);
            }
          }
        });

        if (mainTable) {
          const rows = mainTable.querySelectorAll('tr') as any;
          rows.forEach((row: any, index: any) => {
            if (index === 0) return; // Skip header row
            
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              const entry = {
                number: cells[0]?.textContent?.trim(),
                code: cells[1]?.textContent?.trim(),
                subject: cells[2]?.textContent?.trim(),
                professor: cells[3]?.textContent?.trim()
              };
              
              // Log each entry for debugging
              console.log('Found grade entry:', entry);
              grades.push(entry);
            }
          });
        }

        // Try to find summary table
        const summaryTables = Array.from(tables).filter(table => {
          const rows = table.querySelectorAll('tr');
          return Array.from(rows).some(row => {
            const cells = row.querySelectorAll('td');
            return cells.length === 2 && cells[0]?.textContent?.includes('Nota');
          });
        });

        if (summaryTables.length > 0) {
          const summaryTable = summaryTables[0];
          const rows = summaryTable.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
              const key = cells[0]?.textContent?.trim() || '';
              const value = cells[1]?.textContent?.trim() || '';
              summary[key] = value;
            }
          });
        }

        return {
          gradesData: grades,
          summary: summary,
          debug: debug
        };
      });

      console.log('Debug information:', debug);

      await browser.close();
      console.log('Browser closed');

      if (gradesData.length === 0) {
        return {
          success: false,
          error: 'No grades data found. Debug info: ' + JSON.stringify(debug)
        };
      }

      return {
        success: true,
        data: {
          grades: gradesData,
          summary: summary
        }
      };

    } catch (error) {
      console.error('Error scraping grades:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}