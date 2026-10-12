import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetUsage,fundedBudgetUsage} from '../admin/weekly-budgets.js';
test('warnings include committed tokens and exact 80/95/100 thresholds',()=>{
 assert.equal(budgetUsage('79.999999','100').level,'ok');
 assert.equal(budgetUsage('80','100').level,'warning');
 assert.equal(budgetUsage('95','100').level,'critical');
 assert.equal(budgetUsage('100','100').level,'reached');
 assert.equal(budgetUsage('120','100').percent,100);
});
test('zero pauses reservations; blank cap is explicit; large decimals remain exact',()=>{
 assert.equal(budgetUsage('0','0').level,'reached');
 assert.equal(budgetUsage('500',null).label,'No weekly cap');
 assert.equal(budgetUsage('950000000000000000','1000000000000000000').level,'critical');
});

test('cumulative funded usage warns even without a weekly cap',()=>{
 assert.equal(fundedBudgetUsage('1194','1200').level,'critical');
 assert.equal(fundedBudgetUsage('1194','1200').percent,99.5);
 assert.equal(fundedBudgetUsage('0','1200').level,'ok');
 assert.equal(fundedBudgetUsage('960','1200').level,'warning');
 assert.equal(fundedBudgetUsage('1200','1200').level,'reached');
 assert.equal(fundedBudgetUsage('0','0').label,'Not funded');
 assert.equal(fundedBudgetUsage('0.000000000001','1').level,'ok');
 assert.equal(fundedBudgetUsage(null,null).level,'none');
});

test('funded budget accepts normal and scientific notation and never blanks the wallet panel',()=>{
 assert.equal(fundedBudgetUsage('1194','1200').percent,99.5);
 assert.equal(fundedBudgetUsage(1194,1200).percent,99.5);
 assert.equal(fundedBudgetUsage('1.194e3','1.2E3').percent,99.5);
 assert.equal(fundedBudgetUsage('1194.000000000000000','1200.000000000000000').percent,99.5);
 assert.equal(fundedBudgetUsage('invalid','1200').level,'none');
 assert.equal(fundedBudgetUsage('1194','invalid').label,'Funding data unavailable');
 assert.equal(budgetUsage('1.200000000000','2.000000000000').percent,60);
 assert.equal(budgetUsage('not available','100').level,'none');
});
