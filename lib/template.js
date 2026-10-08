// THE CONSTANT. This is the exact "Stock Analysis Template" HTML from
// How_to_do_Efficient_Stock_Research.pdf (Step 2, second prompt). It is the one
// fixed thing across every research run, regardless of which investment
// methodology is selected. The pipeline hands this exact source to the model and
// instructs it to fill every blank while preserving the layout, producing a
// print-ready HTML report that is converted to PDF (Step 3).

export const TEMPLATE_CSS = `
    body {
        font-family: 'Space Grotesk', sans-serif;
        margin: 40px auto;
        max-width: 1000px;
        background-color: #faf9f6;
        color: #1d325c;
        line-height: 1.6;
    }
    h1 {
        color: #1d325c;
        font-size: 42px;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 4px solid #1d325c;
    }
    h2 {
        color: #1d325c;
        padding-bottom: 5px;
        margin-top: 50px;
        font-size: 32px;
    }
    h3 {
        color: #1d325c;
        margin-top: 25px;
        font-size: 20px;
        margin-bottom: 10px;
    }
    p {
        margin-bottom: 15px;
        font-size: 16px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        margin-bottom: 30px;
        background-color: #ffffff;
    }
    th, td {
        border: 1px solid #dcdcdc;
        padding: 12px 15px;
        text-align: left;
        vertical-align: top;
        color: #1d325c;
        font-size: 15px;
    }
    th {
        background-color: #e6e8eb;
        font-weight: bold;
    }
    .left-header th {
        width: 40%;
    }
    .section {
        margin-bottom: 40px;
    }
    .note {
        font-weight: bold;
        color: #1d325c;
        margin-top: 20px;
        margin-bottom: 20px;
        text-decoration: underline;
        text-underline-offset: 4px;
    }
    a {
        color: #0066cc;
        text-decoration: underline;
        text-underline-offset: 3px;
    }
    a:hover {
        text-decoration: none;
    }
    /* Header formatting */
    .header-table {
        margin-top: 0;
        margin-bottom: 40px;
        background-color: transparent;
    }
    .header-table th, .header-table td {
        border: none;
        padding: 5px 10px 5px 0;
        vertical-align: middle;
        background-color: transparent;
    }
    .header-table th {
        font-weight: normal;
        font-size: 24px;
        color: #1d325c;
    }
    .header-table .meta-label {
        font-size: 14px;
        display: block;
        margin-bottom: 2px;
    }
    .header-table .meta-data {
        font-size: 16px;
        font-weight: bold;
        background-color: #1d325c;
        color: #ffffff;
        padding: 4px 10px;
        border-radius: 4px;
        display: inline-block;
    }
    .header-table .meta-data-light {
        font-size: 16px;
        background-color: #e6e8eb;
        color: #1d325c;
        padding: 4px 10px;
        border-radius: 4px;
        display: inline-block;
    }
    /* Conclusion Table */
    .conclusion-table th {
        text-align: center;
        background-color: transparent;
        border: 1px solid #1d325c;
        font-size: 20px;
    }
    .conclusion-table td {
        border: 1px solid #1d325c;
    }
    .conclusion-table ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }
    .conclusion-table li {
        margin-bottom: 8px;
        text-indent: -1em;
        padding-left: 1em;
    }
    .conclusion-table li:before {
        content: '- ';
    }
    .good-bad-cell {
        text-align: center;
        font-weight: bold;
        background-color: #fcfcfc;
    }
    .good { color: #4CAF50; }
    .okay { color: #FFC107; }
    .bad { color: #F44336; }
    /* Moats Table */
    .moats-table td:nth-child(1) { width: 30%; }
    .moats-table td:nth-child(2) { width: 35%; }
    .moats-table td:nth-child(3) { width: 35%; }

    /* Categorization Table */
    .category-criteria-cell { background-color: #e6e8eb; }
    .checkbox-cell { text-align: center; font-size: 22px; line-height: 1; }

    .subtext {
        font-weight: normal;
        font-size: 12px;
        display: block;
        margin-top: 4px;
    }
    .italic-subtext {
        font-style: italic;
        font-weight: normal;
        font-size: 13px;
        display: block;
        margin-top: 4px;
    }
    ul.hollow-bullets {
        list-style-type: circle;
        padding-left: 20px;
    }
    ul.hollow-bullets li {
        margin-bottom: 10px;
    }
    /* Print */
    @media print {
        body { margin: 0; max-width: none; }
        .section { page-break-inside: auto; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; }
        h1, h2, h3 { page-break-after: avoid; }
    }
`;

// The body of the template exactly as it appears in the guide. The model fills
// every blank, keeps every section, table, class and heading, and leaves the
// visual structure untouched.
export const TEMPLATE_BODY = `
    <div class="section">
        <h1>Stock Research Report</h1>
        <table class="header-table">
            <tr>
                <th style="width: 40%; font-weight: bold;">Company Name</th>
                <th style="width: 30%;">
                    <span class="meta-label">Completed on</span>
                    <span class="meta-data-light">&#x1F4C5; Date</span>
                </th>
                <th style="width: 30%;">
                    <span class="meta-label">Prepared by</span>
                    <span class="meta-data">&#x1F464; Person</span>
                </th>
            </tr>
        </table>
    </div>
    <div class="section">
        <h2>The Core Business</h2>
        <h3>Business Summary:</h3>
        <p></p>

        <h3>Who’s Their Customer?</h3>
        <p></p>

        <h3>TAM & Business Segments:</h3>
        <p></p>

        <h3 style="font-size: 24px; margin-top: 40px;">What makes them different(The Unique Value Proposition)?</h3>
        <p></p>
    </div>
    <div class="section">
        <h2 style="border:none;">What is the investment thesis?</h2>
        <p></p>
    </div>
    <div class="section">
        <h1 style="border:none; margin-bottom: 0;">Growth</h1>
        <h3>Metrics:</h3>
        <table>
            <tr>
                <th>Revenue Growth<br><span class="subtext">(QoQ)</span></th>
                <th>Revenue Growth<br><span class="subtext">(YoY)</span></th>
                <th>EPS Diluted Growth<br><span class="subtext">(YoY)</span></th>
                <th>FCF Per Share Growth<br><span class="subtext">(YoY)</span></th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <th>Revenue Growth<br><span class="subtext">(5YR)</span></th>
                <th>EPS Diluted Growth<br><span class="subtext">(5YR)</span></th>
                <th>FCF Per Share Growth<br><span class="subtext">(5YR)</span></th>
                <th>KPI (Company Specific Metric)<br><span class="subtext">Ex: NRR (for SaaS companies)</span></th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <th>Organic Revenue Growth (%)</th>
                <th>Operating Leverage<br><span class="subtext">(EBIT growth rate/Revenue growth rate)</span></th>
                <th>Revenue Growth Stability<br><span class="subtext" style="font-size:10px;">(Coefficient of Variation) (Standard deviation of revenue growth rates)</span></th>
                <th>ROCE</th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
        </table>
        <div class="note">What to take from this:</div>
        <p></p>
    </div>
    <div class="section">
        <h2>Profitability:</h2>
        <table>
            <tr>
                <th>Gross Profit Margin<br><span class="subtext">(TTM)</span></th>
                <th>Net Profit Margin<br><span class="subtext">(TTM)</span></th>
                <th>FCF Margin (TTM)</th>
                <th>Operating Profit Margin (TTM)</th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <th>Gross Profit Margin<br><span class="subtext">(5YR)</span></th>
                <th>Net Profit Margin<br><span class="subtext">(5YR)</span></th>
                <th>FCF Margin (5YR)</th>
                <th>Operating Profit Margin (5YR)</th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
        </table>
        <div class="note">What to take from this: (Company's Room for Growth, ...)</div>
        <p></p>
    </div>
    <div class="section">
        <h2>Segments:</h2>
        <table>
            <tr>
                <th>Segments</th>
                <th>Revenue Growth<br><span class="subtext">(Last QTR)</span></th>
                <th>Growth YoY</th>
                <th>Gross Profit Margin</th>
                <th>Industry Specific Metric</th>
            </tr>
            <tr>
                <td>Segment A</td><td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <td>Segment B</td><td></td><td></td><td></td><td></td>
            </tr>
        </table>
        <div class="note">What to take from this:</div>
        <p></p>
    </div>
    <div class="section">
        <h1 style="border:none;">Competition</h1>
        <table>
            <tr>
                <th>Competitive Companies</th>
                <th>Unique Value Proposition</th>
                <th>Market Cap</th>
                <th>Gross Margins<br><span class="subtext">(TTM)</span></th>
                <th>Gross Profit Margin (TTM)</th>
                <th>Revenue Growth<br><span class="subtext">(YoY)</span></th>
                <th>Industry Specific Metric</th>
                <th>Market Share</th>
            </tr>
            <tr>
                <td>Company 1</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <td>Company 2</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <td>Company 3</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
        </table>
    </div>
    <div class="section">
        <h2>User Reviews</h2>
        <h3>1. What do users think and rate the company's product/service?</h3>
        <p></p>
        <h3>2. What do Employees rate the work environment and company management?</h3>
        <p></p>
        <h3>3. Competition Comparison among Users:</h3>
        <p></p>
    </div>
    <div class="section">
        <h2><u style="text-underline-offset: 4px;">Moats:</u></h2>
        <table class="moats-table">
            <tr>
                <th>Moat</th>
                <th>Metrics</th>
                <th>Qualitative Analysis</th>
            </tr>
            <tr>
                <td><strong>IP</strong><br><span class="subtext" style="font-size: 15px;">(IP-driven moats arise from patents, proprietary technologies, or unique expertise that competitors can't replicate easily)</span></td>
                <td><strong>Patent Portfolio Strength:</strong><br><span class="italic-subtext">(Number and quality of active patents)</span></td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Network Effect</strong><br><span class="subtext" style="font-size: 15px;">(Network effects exist when value increases exponentially as more users join a service or platform)</span></td>
                <td>
                    <strong>User YoY Growth Rate (%):</strong><br><br>
                    <strong>User YoY Retention Rate (%):</strong><br><br>
                    <strong>Average Revenue Per User (ARPU) Trend:</strong>
                </td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Pricing Power Above Inflation</strong><br><span class="subtext" style="font-size: 15px;">(Ability to raise prices consistently without losing customers or market share + Ability to raise prices over inflation)</span></td>
                <td>
                    <strong>Gross Margin Trend Over Time:</strong><br><br>
                    <strong>Revenue Growth vs. Volume Growth:</strong><br>
                    <span class="italic-subtext" style="font-size: 10px;">(Price-driven growth % should ideally be &gt; Inflation)</span>
                    <span class="italic-subtext" style="font-size: 10px;">(If revenue grows faster than volume sold, pricing power is strong)</span><br>
                    <strong>Historical Price Increase % vs. CPI:</strong>
                </td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Switching Costs</strong><br><span class="subtext" style="font-size: 15px;">(Businesses where customers face significant costs or inconvenience when switching to competitors)</span></td>
                <td>
                    <strong>Customer Retention Rate (%):</strong><br><br>
                    <strong>Customer Lifetime Value (CLV) to Customer Acquisition Cost:</strong><br>
                    <span class="italic-subtext" style="font-size: 10px;">(High CLV relative to acquisition cost signals significant barriers to switching.)</span><br><br>
                    <strong>Recurring Revenue % :</strong><br>
                    <span class="italic-subtext" style="font-size: 10px;">(Recurring revenue/Total revenue)</span>
                    <span class="italic-subtext" style="font-size: 10px;">High recurring revenue often indicates significant switching costs.</span>
                </td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Irreplaceable Physical Assets</strong><br><span class="subtext" style="font-size: 15px;">(Unique, difficult-to-replicate infrastructure or assets that competitors cannot duplicate due to logistical, geographic, or regulatory barriers)</span></td>
                <td>
                    <strong>Return on Assets (ROA):</strong><br>
                    <span class="italic-subtext" style="font-size: 10px;">(Profit/Total Assets)</span>
                    <span class="italic-subtext" style="font-size: 10px;">High ROA in capital-intensive industries signals valuable, well-positioned assets.</span><br><br>
                    <strong>Replacement Cost vs. Market Value:</strong><br>
                    <span class="italic-subtext" style="font-size: 10px;">(Replacement cost significantly exceeds current market value)</span>
                    <span class="italic-subtext" style="font-size: 10px;">High replacement cost deters competitors from entering the market.</span><br><br>
                    <strong>Asset Utilization Ratio:</strong><br>
                    <span class="italic-subtext" style="font-size: 10px;">(Revenue/Total Assets)</span>
                    <span class="italic-subtext" style="font-size: 10px;">High utilization indicates strong demand and limited substitutability of assets.</span>
                </td>
                <td></td>
            </tr>
        </table>
        <div class="note">What to take from this:</div>
        <p></p>
    </div>
    <div class="section">
        <h1 style="border:none;">Valuation:</h1>
        <table class="left-header">
            <tr><th>PE Ratio</th><td></td></tr>
            <tr><th>Forward PE Ratio</th><td></td></tr>
            <tr><th>Price to Sales</th><td></td></tr>
            <tr><th>EV/EBITDA</th><td></td></tr>
            <tr><th>PEG</th><td></td></tr>
            <tr><th>PEG (FRWD)</th><td></td></tr>
            <tr><th>PCFG</th><td></td></tr>
            <tr><th>PCFG (FRWD)</th><td></td></tr>
            <tr><th>PCF</th><td></td></tr>
            <tr><th>PCF (FRWD)</th><td></td></tr>
            <tr><th>FCF Yield</th><td></td></tr>
            <tr><th>Market Cap/ Annualized Quarterly Revenue</th><td></td></tr>
            <tr><th>Sector Average Valuation metric (choose one that best reflects the industry)</th><td></td></tr>
        </table>

        <p style="font-size: 16px; margin-top: 20px;">Historical Valuation Chart: (Chart History of Valuation metric you think is most relevant for this company)</p>
        <div class="note" style="margin-bottom: 5px;">What to take from this:</div>
        <p style="font-size: 12px; font-weight: bold; text-decoration: underline; margin-top: 0;">(Choose a Valuation metric that best represents the company at its current stage of maturity. Why is it currently at the valuation it is now? & Explain Previous Jumps/Falls in Valuations)</p>
    </div>
    <div class="section">
        <h1 style="border:none; margin-bottom: 0;">Earnings:</h1>
        <h3>Key Highlights of Latest Earnings Call:</h3>
        <p style="font-size: 14px; font-weight: bold; margin-top:-10px;">(Company plans, guidance, Analyst Q&A,...)</p>
        <ul style="list-style-type: none; padding-left: 20px;">
            <li>- Highlight 1</li>
            <li>- Highlight 2</li>
        </ul>

        <h2 style="border:none; margin-top: 40px;">Results vs. Guidance:</h2>

        <h3 style="margin-bottom: 5px;">Most Recent Quarter:</h3>
        <table class="left-header">
            <tr>
                <th style="background-color: #e6e8eb;">Item</th>
                <th style="background-color: #e6e8eb;">Guidance</th>
                <th style="background-color: #e6e8eb;">Results</th>
            </tr>
            <tr>
                <th>Revenue</th>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <th>Operating Income</th>
                <td></td>
                <td></td>
            </tr>
        </table>
        <h3 style="margin-bottom: 5px;">Next Quarter:</h3>
        <table class="left-header">
            <tr>
                <th style="background-color: #e6e8eb;">Item</th>
                <th style="background-color: #e6e8eb;">Guidance</th>
                <th style="background-color: #e6e8eb;">Results</th>
            </tr>
            <tr>
                <th>Revenue</th>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <th>Operating Income</th>
                <td></td>
                <td></td>
            </tr>
        </table>
        <h3 style="margin-bottom: 5px;">Historical Record: (Last 8 Quarters)</h3>
        <table class="left-header">
            <tr>
                <th style="background-color: #e6e8eb;">Item</th>
                <th style="background-color: #e6e8eb;">Q-7</th>
                <th style="background-color: #e6e8eb;">Q-6</th>
                <th style="background-color: #e6e8eb;">Q-5</th>
                <th style="background-color: #e6e8eb;">Q-4</th>
                <th style="background-color: #e6e8eb;">Q-3</th>
                <th style="background-color: #e6e8eb;">Q-2</th>
                <th style="background-color: #e6e8eb;">Q-1</th>
                <th style="background-color: #e6e8eb;">Latest</th>
            </tr>
            <tr>
                <th>Revenue</th>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
            </tr>
            <tr>
                <th>Operating Income</th>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
                <td><span class="good">BEAT</span>/<span class="bad">MISS</span></td>
            </tr>
        </table>
        <div class="note">What to take from this: (Include explanation for significant misses/ significant beats)</div>
        <p></p>
    </div>
    <div class="section">
        <h1 style="border:none;">Capital Allocation:</h1>
        <table class="left-header" style="width: 50%;">
            <tr><th>ROIC(TTM)</th><td></td></tr>
            <tr><th>Shareholder Yield (TTM)</th><td></td></tr>
            <tr><th>Credit Rating on Debt</th><td></td></tr>
        </table>

        <table>
            <tr>
                <th>Net Debt</th>
                <th>Debt to Equity</th>
                <th>Net Debt to EBITDA</th>
                <th>Diluted SBC as a % of OCF</th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
        </table>

        <table>
            <tr>
                <th>Share Buybacks (TTM) ($)</th>
                <th>Buyback Yield (TTM)</th>
                <th>Shares Trend (YoY)</th>
                <th>Authorized Buybacks Left ($)</th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <th>Dividend Yield</th>
                <th>Payout Ratio</th>
                <th>Div Growth (YoY)</th>
                <th>Div Growth (5YR)</th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
            <tr>
                <th>Free Cash Flow Conversion Ratio<br><span class="italic-subtext" style="font-size:10px;">(Free Cash Flow/Net Income)</span></th>
                <th>Interest Coverage Ratio<br><span class="italic-subtext" style="font-size:10px;">(EBIT/Interest Expense)</span></th>
                <th>Current Ratio<br><span class="italic-subtext" style="font-size:10px;">(Current Assets/Current Liabilities)</span></th>
                <th>Cash Conversion Ratio</th>
            </tr>
            <tr>
                <td></td><td></td><td></td><td></td>
            </tr>
        </table>
        <div class="note">What to take from this:</div>
        <p></p>
    </div>
    <div class="section">
        <h1 style="border:none; margin-bottom: 10px;">DCF Model:</h1>
        <a href="https://www.finology.in/Calculators/Invest/DCF-Calculator.aspx" target="_blank" style="font-size: 16px;">https://www.finology.in/Calculators/Invest/DCF-Calculator.aspx</a>
        <h3 style="font-weight: normal;">Explain your assumptions:</h3>
        <p></p>
    </div>
    <div class="section">
        <h1 style="border:none; margin-bottom: 20px;">SWOT Analysis:</h1>

        <h3 style="margin-bottom: 5px;">Threats & Weaknesses: <span style="font-size:14px; font-weight:bold;">(Insider Trading, Geographic Risks, Change of Management, Company Culture, Layoffs, Macroeconomic environment, High Valuation, Margins, etc...)</span></h3>
        <ul style="list-style-type: disc; padding-left: 40px; margin-top: 0;">
            <li>Risk 1</li>
            <li>Risk 2</li>
            <li>Weakness 1</li>
            <li>Weakness 2</li>
        </ul>

        <h3 style="margin-bottom: 5px;">Opportunities & Strengths: <span style="font-size:14px; font-weight:bold;">(Industry is trending, low margins indicate room for growth, government spending, etc...)</span></h3>
        <ul style="list-style-type: disc; padding-left: 40px; margin-top: 0;">
            <li>Opportunity 1</li>
            <li>Opportunity 2</li>
            <li>Strength 1</li>
            <li>Strength 2</li>
        </ul>
    </div>
    <div class="section">
        <h2 style="border:none; margin-bottom: 5px;">Questions to Think About:</h2>
        <p style="font-weight: bold; margin-top: 0; font-size: 15px;">(Can they tackle their Risks & take on their Opportunities? How Sustainable are their Strengths?)</p>
        <ul style="list-style-type: none; padding-left: 20px; font-size: 15px; margin-top: 0;">
            <li>- Question 1</li>
            <li>- Question 2</li>
            <li>- Question 3</li>
        </ul>
    </div>
    <div class="section">
        <h1 style="border:none; margin-bottom: 30px;">Conclusion:</h1>
        <table class="conclusion-table" style="border: 2px solid #1d325c;">
            <tr>
                <td style="font-size: 20px; color: #1d325c; padding: 15px; text-align: center;">Business</td>
                <td style="font-size: 20px; color: #1d325c; padding: 15px; text-align: center;">Operations</td>
                <td rowspan="2" style="font-size: 20px; color: #1d325c; vertical-align: middle; text-align: center;">Valuation</td>
            </tr>
            <tr>
                <td style="padding-left: 30px;">
                    <ul>
                        <li>Competition</li>
                        <li>Industry</li>
                        <li>Growth Thesis</li>
                        <li>Revenue Growth</li>
                        <li>Segments</li>
                    </ul>
                </td>
                <td style="padding-left: 30px;">
                    <ul>
                        <li>Cash Flow Growth</li>
                        <li>Debt</li>
                        <li>Profitability & Margins</li>
                        <li>ROIC</li>
                        <li>Dividend Record</li>
                        <li>Earnings Record</li>
                    </ul>
                </td>
            </tr>
            <tr>
                <td class="good-bad-cell"><span class="good">Good</span>/<span class="okay">Okay</span>/<span class="bad">Bad</span></td>
                <td class="good-bad-cell"><span class="good">Good</span>/<span class="okay">Okay</span>/<span class="bad">Bad</span></td>
                <td class="good-bad-cell"><span class="good">Good</span>/<span class="okay">Okay</span>/<span class="bad">Bad</span></td>
            </tr>
        </table>
    </div>
    <div class="section">
        <h2>Key Research Question & Statistical Validation</h2>

        <h3>The Core Question:</h3>
        <p>[Insert the specific research question driving this analysis. Ex: "Does a 10% increase in Capex historically lead to an expansion in valuation multiples within 12 months?"]</p>

        <h3>Qualitative Analysis:</h3>
        <p>[Provide a breakdown of the mechanics behind the question. Address why this variable matters operationally and how it theoretically impacts the business fundamentals.]</p>

        <h3>Statistical Thesis Testing:</h3>
        <p>Testing the historical impact of the implied thesis on the stock's price action.</p>
        <table>
            <tr>
                <th style="width: 20%;">Statistical Test</th>
                <th style="width: 40%;">Hypotheses</th>
                <th style="width: 15%;">Test Statistic (t-stat / F-stat)</th>
                <th style="width: 15%;">P-Value</th>
                <th style="width: 10%;">Significance (Alpha = 0.05)</th>
            </tr>
            <tr>
                <td>(e.g., Two-Sample T-Test, OLS Regression, ANOVA)</td>
                <td>
                    <strong>H0 (Null):</strong> [The variable/event has NO statistically significant effect on the stock's forward returns.]<br><br>
                    <strong>H1 (Alternative):</strong> [The variable/event HAS a statistically significant effect on the stock's forward returns.]
                </td>
                <td></td>
                <td></td>
                <td>[Reject H0 / Fail to Reject H0]</td>
            </tr>
            <tr>
                <th>Correlation Coefficient (R / R²)</th>
                <td colspan="4"></td>
            </tr>
            <tr>
                <th>Sample Size (n) & Timeframe</th>
                <td colspan="4"></td>
            </tr>
        </table>

        <div class="note">Statistical Conclusion: (Translate the p-value and test results into plain English. Does the historical data prove the thesis has an edge, or is the market noise too high?)</div>
        <p></p>
    </div>
    <div class="section">
        <h2 style="border:none;">Investment Questions:</h2>
        <ul class="hollow-bullets">
            <li><strong>Why now?</strong></li>
            <li><strong>What is it that others aren't realizing about this stock? Why aren't they realizing this?</strong></li>
            <li><strong>What has the market priced in this stock? What has it not?</strong></li>
            <li><strong>Why exactly would you be on the winning side of this trade?</strong></li>
        </ul>
        <br>
        <p>If this is a **large-cap** stock (efficient price), what is the unseen future information that will push the price higher? If this is a **low-cap** stock (information advantage), what specific information do you know that others don't?</p>
    </div>
    <div class="section">
        <h2 style="border:none;">Categorization: Which Category does this Stock belong to?</h2>
        <table>
            <tr>
                <th style="width:30%; background-color:#aeb5c0; text-align:center;">Category</th>
                <th style="width:50%; background-color:#aeb5c0; text-align:center;">Criteria</th>
                <th style="width:20%; background-color:#aeb5c0; text-align:center;">Answer</th>
            </tr>

            <tr>
                <td rowspan="7" style="font-weight: bold; background-color: #e6e8eb;">Compounding Machine</td>
                <td class="category-criteria-cell"></td>
                <td class="category-criteria-cell" style="text-align: center; font-weight: bold;"><span class="good">Yes</span>/<span class="bad">No</span></td>
            </tr>
            <tr>
                <td class="category-criteria-cell">ROCE &gt; 20%</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Strong Moats?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Gross Margins &gt; 40%?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Interest Coverage &gt; 15x?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Cash Conversion &gt; 100% of profits?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">FCF per Share growth acceleration?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td rowspan="6" style="font-weight: bold; background-color: #e6e8eb;">Dividend Growth Investing Powerhouse</td>
                <td class="category-criteria-cell"></td>
                <td class="category-criteria-cell" style="text-align: center; font-weight: bold;"><span class="good">Yes</span>/<span class="bad">No</span></td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Dividends Strictly Increasing for more than 10 years?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Market Cap &gt; $100B?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">International Sales &gt; 50%?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">5 YR Dividend Growth Rate &gt; 10%?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Dividend Yield &gt; 2%?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td style="font-weight: bold; background-color: #e6e8eb; border-bottom: none;"></td>
                <td class="category-criteria-cell">Payout Ratio &lt; 50%?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td rowspan="6" style="font-weight: bold; background-color: #e6e8eb; border-top: none;">Disruptive Growth Stock</td>
                <td class="category-criteria-cell"></td>
                <td class="category-criteria-cell" style="text-align: center; font-weight: bold;"><span class="good">Yes</span>/<span class="bad">No</span></td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Organic Revenue Growth (YoY) &gt; 20%?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">TAM &gt; $10B?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Gaining Significant Market Share?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Low Current Ratio?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td class="category-criteria-cell">Revenue Growth (YoY) &gt; than Competition?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
            <tr>
                <td style="background-color: #e6e8eb;"></td>
                <td class="category-criteria-cell">Industry-Specific KPI outperformance?</td>
                <td class="checkbox-cell">&#9744;</td>
            </tr>
        </table>
    </div>
    <div class="section">
        <h3 style="border:none; margin-bottom: 30px;">Short-term Outlook:</h3>
        <p></p>
    </div>
    <div class="section">
        <h3 style="border:none; margin-bottom: 30px;">Long-term Outlook:</h3>
        <p></p>
    </div>
    <div class="section">
        <h2 style="border:none; text-decoration: underline; text-underline-offset: 4px;">Final Recommendation:</h2>
        <p></p>
    </div>
    <section class="section">
        <h2>Bibliography</h2>
        <ul>
            <li>Source 1 details go here</li>
            <li>Source 2 details go here</li>
        </ul>
    </section>
`;

// Plain-text list of the sections (used for prompts and progress reporting).
export const TEMPLATE_SECTIONS = [
  'Header (Company Name, Completed on, Prepared by)',
  'The Core Business (Business Summary; Who\'s Their Customer; TAM & Business Segments; Unique Value Proposition)',
  'What is the investment thesis?',
  'Growth metrics table + "What to take from this"',
  'Profitability (TTM & 5YR margins) + takeaway',
  'Segments table + takeaway',
  'Competition table (3+ comparable companies)',
  'User Reviews (1. users/product; 2. employees/Glassdoor; 3. competition comparison among users)',
  'Moats table (IP, Network Effect, Pricing Power, Switching Costs, Irreplaceable Assets) + takeaway',
  'Valuation table (PE, Fwd PE, P/S, EV/EBITDA, PEG, PCFG, PCF, FCF Yield, MC/annualized rev, sector avg) + historical valuation + takeaway',
  'Earnings (call highlights; results vs guidance; last-8-quarter BEAT/MISS) + takeaway',
  'Capital Allocation tables + takeaway',
  'DCF Model (conservative / base / optimistic with explicit assumptions from analyst forecasts)',
  'SWOT Analysis',
  'Questions to Think About',
  'Conclusion table (Business / Operations / Valuation: Good/Okay/Bad)',
  'Key Research Question & Statistical Validation (test, H0/H1, test statistic, p-value, significance, R/R², n & timeframe, conclusion)',
  'Investment Questions (Why now? What others miss? What is priced in? Why on the winning side? Large-cap vs low-cap edge)',
  'Categorization table (Compounding Machine / Dividend Growth Powerhouse / Disruptive Growth Stock checklists)',
  'Short-term Outlook; Long-term Outlook',
  'Final Recommendation (answers the research question, anchored to the methodology)',
  'Bibliography (every source and what it was used for)',
];

// Full template document (what the guide pastes into the second prompt).
export function templateDocument() {
  return wrapReport(TEMPLATE_BODY, 'Stock Analysis Template');
}

// Wraps a filled body into a complete, styled, print-ready document.
export function wrapReport(bodyHtml, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
<style>${TEMPLATE_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// If the model returns a whole document, keep only what is inside <body>.
export function extractBody(html) {
  const m = String(html || '').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1].trim() : String(html || '').trim();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
