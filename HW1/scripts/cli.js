require('yargs')
  .usage('$0 <cmd> [args]')
  .command('area [type]', "calc area", (yargs) => 
  {
    yargs.positional('type', {
      type: 'string',
      default: 'rect',
      describe: 'The type of shape to calculate area.'
    })
    .option("w", {
      describe: "The width of the area.",
      type: "number"
    })
    .option("h", {
      describe: "The height of the area.",
      type: "number"
    })
    .option("r", {
      describe: "The radius of the circle.",
      type: "number"
    })
    .option("v", {
      describe: "Print all arguments received"
    })
  }, function (argv) { calc(argv) } )
  .help()
  .argv

function calc(argv) {
  let {w,h,r,type,v} = argv;
  
  if (v !== undefined) {
    console.log( "\nArguments received:");
    if (w !== undefined) {
      console.log("w = "+w);
    }
    if (h !== undefined) {
      console.log("h = "+h);
    }
    if (r !== undefined) {
      console.log("r = "+r);
    }
    if (type !== undefined) {
      console.log("type = "+type);
    }
  }
  
  if( type == "rect") {
    console.log( `\nArea: ${w * h}`);
  }
  if( type == "circle" ) {
    console.log( `\nArea: ${Math.PI*r*r}`);
  }
}
