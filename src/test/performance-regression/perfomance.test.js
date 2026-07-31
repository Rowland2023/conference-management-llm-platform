test("Health endpoint under 200ms", async () => {

    const start = Date.now();

    await request(app).get("/health");

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(200);

});