const { exec } = require('child_process');

const port = 3000;

const command = `netstat -ano | findstr :${port}`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.log(`Port ${port} is free!`);
        return;
    }

    const lines = stdout.split('\n');
    const pids = new Set();

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
            pids.add(pid);
        }
    });

    if (pids.size === 0) {
        console.log(`No process found on port ${port}`);
        return;
    }

    console.log(`Found processes on port ${port}: ${Array.from(pids).join(', ')}`);

    pids.forEach(pid => {
        console.log(`Killing PID ${pid}...`);
        exec(`taskkill /F /PID ${pid}`, (err, out) => {
            if (err) console.error(`Failed to kill ${pid}: ${err.message}`);
            else console.log(`Successfully killed ${pid}`);
        });
    });
});
