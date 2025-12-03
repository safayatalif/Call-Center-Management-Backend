-- Check current data in tables

-- 1. Check employees
SELECT empno_pk, empcode, name, role, empstatus FROM employees LIMIT 5;

-- 2. Check customers
SELECT custno_pk, custcode, custname, custmobilenumber, projectno_fk FROM customer LIMIT 5;

-- 3. Check assignments
SELECT 
    ca.assignno_pk,
    ca.empno_pk,
    e.name as employee_name,
    ca.custno_fk,
    c.custname as customer_name,
    ca.callstatus,
    ca.callpriority
FROM custassignment ca
INNER JOIN employees e ON ca.empno_pk = e.empno_pk
INNER JOIN customer c ON ca.custno_fk = c.custno_pk
LIMIT 10;

-- 4. Check if specific employee has assignments (replace 1 with your empno_pk)
SELECT 
    ca.*,
    c.custname,
    p.projectname
FROM custassignment ca
INNER JOIN customer c ON ca.custno_fk = c.custno_pk
LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
WHERE ca.empno_pk = 1;  -- Replace 1 with your employee ID
