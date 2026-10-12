import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetUsage} from '../admin/weekly-budgets.js';
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
