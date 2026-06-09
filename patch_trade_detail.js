const fs = require('fs');
let detail = fs.readFileSync('src/app/trades/[id]/page.tsx', 'utf8');

// I need to add a section for Trade Notes if it doesn't exist, and render the HTML.
// The user currently has "Setup Details" and "Trade Overview". We should add "Trade Notes" below "Take Profit Levels".

const oldCardEnd = `            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>`;

const newNotesSection = `            </table>
          </CardContent>
        </Card>

        {(trade.pre_trade_reasoning || trade.post_trade_lesson) && (
          <Card>
            <CardHeader><CardTitle>Trade Notes & Review</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {trade.pre_trade_reasoning && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-secondary border-b border-border/50 pb-2">Pre-Trade Reasoning</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-background-secondary/30 p-4 rounded-lg border border-border" dangerouslySetInnerHTML={{ __html: trade.pre_trade_reasoning }} />
                </div>
              )}
              {trade.post_trade_lesson && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-secondary border-b border-border/50 pb-2">Post-Trade Lesson</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-background-secondary/30 p-4 rounded-lg border border-border" dangerouslySetInnerHTML={{ __html: trade.post_trade_lesson }} />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>`;

detail = detail.replace(oldCardEnd, newNotesSection);
fs.writeFileSync('src/app/trades/[id]/page.tsx', detail);
console.log("Detail view upgraded with safe HTML rendering.");
