# Neosphere

The project was generated using the [Clean.Architecture.Solution.Template](https://github.com/jasontaylordev/CleanArchitecture) version 10.8.0.

## Build

Run `dotnet build` to build the solution.

## Run

To run the application:

```bash
dotnet run --project ./src/AppHost
```

The Aspire dashboard will open automatically, showing the application URLs and logs.

## Code Styles & Formatting

The template includes [EditorConfig](https://editorconfig.org/) support to help maintain consistent coding styles for multiple developers working on the same project across various editors and IDEs. The **.editorconfig** file defines the coding styles applicable to this solution.

## Code Scaffolding

The template includes support to scaffold new commands and queries.

Start in the `.\src\Application\` folder.

Create a new command:

```
dotnet new ca-usecase --name CreateField --feature-name Fields --usecase-type command --return-type int
```

Create a new query:

```
dotnet new ca-usecase -n GetFields -fn Fields -ut query -rt FieldsVm
```

If you encounter the error *"No templates or subcommands found matching: 'ca-usecase'."*, install the template and try again:

```bash
dotnet new install Clean.Architecture.Solution.Template::10.8.0
```
