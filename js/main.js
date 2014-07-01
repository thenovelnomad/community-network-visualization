var width = 960,
    height = 1000;

var color = d3.scale.category20();

var force = d3.layout.force()
    .gravity(0.1)
    .charge(-1000)
    .linkDistance(150)
    .size([width, height]);

var svg = d3.select(".row").append("svg")
    .attr("width", "100%")
    .attr("height", height);
svg.append("g").append("clipPath")
    .attr("id","circle-path")
  .append("circle")
    .attr("r", 30)

d3.json("./data/data3.json", function(error, graph) {
  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var gNode = svg.selectAll(".node")
      .data(graph.nodes)
    .enter().append("g")
      .attr("class", function(d) { return "node" + d.type; })
      .call(force.drag);

  gNode.append("circle")
    .attr("r", function(d) { return d.radius; })
     .style("fill", function(d) { return color(d.group); });

  gNode.append("image")
    .attr("clip-path", "url(#circle-path)")
    .attr("xlink:href", function(d) { 
      if (d.url) {
        return d.url;
      }
    })
    .attr("x", -30)
    .attr("y", -30)
    .attr("width", 60)
    .attr("height", 60);

  gNode.append("text")
    .attr("text-anchor", "middle")
    .attr("dx", 0)
    .attr("dy", function(d) { 
      if (d.type === "mem") {
        return d.radius*1.5;
      } else if (d.type === "prj") {
        return d.radius*2.0;
      } 
    })
    .text(function(d) { return d.name });

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    gNode.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    // node.attr("cx", function(d) { return d.x; })
    //     .attr("cy", function(d) { return d.y; });
  });
});

