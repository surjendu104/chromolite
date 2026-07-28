import typer
import uvicorn

app = typer.Typer()


@app.command()
def run(path: str = "./chroma"):
    from chromolite.connection import db

    db.connect(path)

    uvicorn.run(
        "chromolite.main:app",
        host="127.0.0.1",
        port=48731,
        reload=False,
    )


@app.command()
def info():
    print("Info subcommand invoked")


if __name__ == "__main__":
    app()
