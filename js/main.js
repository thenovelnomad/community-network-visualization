var width = 960,
    height = 1000;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-1000)
    .linkDistance(200)
    .size([width, height]);

var svg = d3.select(".row").append("svg")
    .attr("width", width)
    .attr("height", height);

d3.json("./data/data2.json", function(error, graph) {
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
      .attr("class", "node")
      .attr("height", 100)
      .attr("width", 100)
      .call(force.drag);

  var node = gNode.append("circle")
  	.attr("r", function(d) { return d.radius; })
      .style("fill", function(d) { return color(d.group); });

  node.append("text")
  	.attr("dx", function(d) { return -20; })
    .text(function(d) { return d.name; });

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  });
});

