package com.cvlab.spring.LaPatho.project.controller;

import com.cvlab.spring.LaPatho.AnnotationEntity;
import com.cvlab.spring.LaPatho.AnnotationRepository;
import com.cvlab.spring.LaPatho.ImageEntity;
import com.cvlab.spring.LaPatho.project.entity.Project;
import com.cvlab.spring.LaPatho.project.repository.ProjectRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Report Controller for generating annotation datasets
 * Output format is designed for deep learning model training
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ReportController {

    private final ProjectRepository projectRepository;
    private final AnnotationRepository annotationRepository;
    private final ObjectMapper objectMapper;

    // Comma separator for CSV format
    private static final String SEP = ",";

    @GetMapping("/{projectId}/annotations/report")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> generateAnnotationReport(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        StringBuilder report = new StringBuilder();

        // Build label index for class IDs
        Set<String> labelSet = new LinkedHashSet<>();
        List<ImageEntity> images = project.getImages().stream().toList();

        for (ImageEntity image : images) {
            List<AnnotationEntity> annotations = annotationRepository.findByImageId(image.getId());
            for (AnnotationEntity ann : annotations) {
                if (ann.getType() != null && !ann.getType().isEmpty()) {
                    labelSet.add(ann.getType());
                }
            }
        }

        List<String> labelList = new ArrayList<>(labelSet);

        // CSV Column headers (first row)
        report.append("image_id").append(SEP);
        report.append("image_name").append(SEP);
        report.append("image_width").append(SEP);
        report.append("image_height").append(SEP);
        report.append("label_id").append(SEP);
        report.append("label_name").append(SEP);
        report.append("shape_type").append(SEP);
        report.append("coordinates").append(SEP);
        report.append("grade").append(SEP);
        report.append("notes").append(SEP);
        report.append("annotator").append("\n");

        // Data rows
        int totalAnnotations = 0;

        for (ImageEntity image : images) {
            List<AnnotationEntity> annotations = annotationRepository.findByImageId(image.getId());

            String imageName = image.getName() != null ? image.getName() : "image_" + image.getId();
            int imageWidth = image.getWidth();
            int imageHeight = image.getHeight();

            for (AnnotationEntity annotation : annotations) {
                totalAnnotations++;

                String annotator = annotation.getUser() != null ?
                        annotation.getUser().getUsername() :
                        (annotation.getCreator() != null ? annotation.getCreator() : "unknown");

                String labelName = annotation.getType() != null ? annotation.getType() : "unknown";
                int labelId = labelList.indexOf(labelName);
                if (labelId < 0) labelId = -1;

                // Parse geometry
                GeometryData geom = parseGeometry(annotation.getGeometry());

                // Parse grade and notes from geometry JSON
                String grade = parseGradeFromGeometry(annotation.getGeometry());
                String notes = parseNotesFromGeometry(annotation.getGeometry());

                // Log for debugging
                System.out.println("📊 Annotation ID: " + annotation.getId() +
                    ", Type: " + labelName +
                    ", ShapeType: " + geom.shapeType +
                    ", Grade: " + grade +
                    ", Coords: " + geom.coordinates);

                report.append(image.getId()).append(SEP);
                report.append(sanitize(imageName)).append(SEP);
                report.append(imageWidth).append(SEP);
                report.append(imageHeight).append(SEP);
                report.append(labelId).append(SEP);
                report.append(sanitize(labelName)).append(SEP);
                report.append(geom.shapeType).append(SEP);
                report.append(geom.coordinates).append(SEP);
                report.append(sanitize(grade)).append(SEP);
                report.append(sanitize(notes)).append(SEP);
                report.append(sanitize(annotator)).append("\n");
            }
        }

        // Create file with .csv extension
        String fileName = project.getName().replaceAll("[^a-zA-Z0-9]", "_") +
                "_dataset_" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) +
                ".csv";

        // Add UTF-8 BOM for Excel compatibility with Turkish characters
        byte[] bom = new byte[] { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF };
        byte[] contentBytes = report.toString().getBytes(StandardCharsets.UTF_8);
        byte[] reportBytes = new byte[bom.length + contentBytes.length];
        System.arraycopy(bom, 0, reportBytes, 0, bom.length);
        System.arraycopy(contentBytes, 0, reportBytes, bom.length, contentBytes.length);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .contentLength(reportBytes.length)
                .body(reportBytes);
    }

    /**
     * Simple data class to hold parsed geometry information
     */
    private static class GeometryData {
        String shapeType;
        String coordinates;

        GeometryData(String shapeType, String coordinates) {
            this.shapeType = shapeType;
            this.coordinates = coordinates;
        }
    }

    /**
     * Sanitize string for CSV format (escape quotes and handle commas)
     */
    private String sanitize(String input) {
        if (input == null) return "";
        // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
        String cleaned = input.replace("\n", " ").replace("\r", "");
        if (cleaned.contains(",") || cleaned.contains("\"")) {
            cleaned = "\"" + cleaned.replace("\"", "\"\"") + "\"";
        }
        return cleaned;
    }

    /**
     * Parse grade value from geometry JSON body array
     */
    private String parseGradeFromGeometry(String geometryJson) {
        if (geometryJson == null || geometryJson.isEmpty()) {
            return "";
        }
        try {
            JsonNode root = objectMapper.readTree(geometryJson);
            JsonNode body = root.path("body");
            if (body.isArray()) {
                for (JsonNode item : body) {
                    String purpose = item.path("purpose").asText("");
                    if ("grading".equals(purpose)) {
                        return item.path("value").asText("");
                    }
                }
            }
        } catch (Exception e) {
            // Ignore parsing errors
        }
        return "";
    }

    /**
     * Parse notes/comments from geometry JSON body array
     */
    private String parseNotesFromGeometry(String geometryJson) {
        if (geometryJson == null || geometryJson.isEmpty()) {
            return "";
        }
        try {
            JsonNode root = objectMapper.readTree(geometryJson);
            JsonNode body = root.path("body");
            if (body.isArray()) {
                for (JsonNode item : body) {
                    String purpose = item.path("purpose").asText("");
                    if ("commenting".equals(purpose)) {
                        return item.path("value").asText("");
                    }
                }
            }
        } catch (Exception e) {
            // Ignore parsing errors
        }
        return "";
    }

    private GeometryData parseGeometry(String geometryJson) {
        if (geometryJson == null || geometryJson.isEmpty()) {
            return new GeometryData("UNKNOWN", "");
        }

        try {
            JsonNode root = objectMapper.readTree(geometryJson);

            // Try multiple paths for selector - Annotorious can use different formats
            JsonNode selector = root.path("target").path("selector");

            if (selector.isMissingNode() || !selector.has("value")) {
                selector = root.path("selector");
            }

            // Handle array of selectors (some Annotorious versions use this)
            if (selector.isArray() && selector.size() > 0) {
                selector = selector.get(0);
            }

            // Also check for target as array
            JsonNode target = root.path("target");
            if (target.isArray() && target.size() > 0) {
                selector = target.get(0).path("selector");
            }

            String svgValue = selector.path("value").asText("");
            String selectorType = selector.path("type").asText("");

            // Check for FragmentSelector (used by rectangle tool)
            if ("FragmentSelector".equals(selectorType) || svgValue.isEmpty()) {
                String conformsTo = selector.path("conformsTo").asText("");
                String fragmentValue = selector.path("value").asText("");

                // xywh format: xywh=pixel:x,y,w,h or xywh=percent:x,y,w,h
                if (fragmentValue.startsWith("xywh=")) {
                    String coords = fragmentValue.replace("xywh=pixel:", "").replace("xywh=percent:", "").replace("xywh=", "");
                    String[] parts = coords.split(",");
                    if (parts.length == 4) {
                        double x = parseDouble(parts[0]);
                        double y = parseDouble(parts[1]);
                        double w = parseDouble(parts[2]);
                        double h = parseDouble(parts[3]);
                        return new GeometryData("RECT", String.format("%.2f,%.2f,%.2f,%.2f", x, y, w, h));
                    }
                }
            }

            // Check for PointSelector or very small circle (used by point tool)
            if ("PointSelector".equals(selectorType)) {
                double x = selector.path("x").asDouble(0);
                double y = selector.path("y").asDouble(0);
                return new GeometryData("POINT", String.format("%.2f,%.2f", x, y));
            }

            if (svgValue.isEmpty()) {
                // Try to extract from other formats
                return extractFromAlternativeFormats(root);
            }

            // Parse different shape types from SVG
            if (svgValue.contains("<rect")) {
                return parseRectangle(svgValue);
            } else if (svgValue.contains("<ellipse")) {
                return parseEllipse(svgValue);
            } else if (svgValue.contains("<circle")) {
                return parseCircle(svgValue);
            } else if (svgValue.contains("<polygon")) {
                return parsePolygon(svgValue);
            } else if (svgValue.contains("<path")) {
                return parsePath(svgValue);
            }

            return new GeometryData("UNKNOWN", svgValue);

        } catch (Exception e) {
            return new GeometryData("ERROR", e.getMessage());
        }
    }

    /**
     * Extract geometry from alternative annotation formats
     */
    private GeometryData extractFromAlternativeFormats(JsonNode root) {
        // Check for shapes array (OpenSeadragon Annotorious format)
        JsonNode shapes = root.path("shapes");
        if (shapes.isArray() && shapes.size() > 0) {
            JsonNode firstShape = shapes.get(0);
            String type = firstShape.path("type").asText("");

            if ("rect".equalsIgnoreCase(type)) {
                double x = firstShape.path("x").asDouble(0);
                double y = firstShape.path("y").asDouble(0);
                double w = firstShape.path("width").asDouble(0);
                double h = firstShape.path("height").asDouble(0);
                return new GeometryData("RECT", String.format("%.2f,%.2f,%.2f,%.2f", x, y, w, h));
            } else if ("point".equalsIgnoreCase(type)) {
                double x = firstShape.path("x").asDouble(0);
                double y = firstShape.path("y").asDouble(0);
                return new GeometryData("POINT", String.format("%.2f,%.2f", x, y));
            } else if ("circle".equalsIgnoreCase(type)) {
                double cx = firstShape.path("cx").asDouble(0);
                double cy = firstShape.path("cy").asDouble(0);
                double r = firstShape.path("r").asDouble(0);
                return new GeometryData("CIRCLE", String.format("%.2f,%.2f,%.2f", cx, cy, r));
            }
        }

        // Check for geometry field directly
        JsonNode geometry = root.path("geometry");
        if (!geometry.isMissingNode()) {
            String geoType = geometry.path("type").asText("");
            JsonNode coords = geometry.path("coordinates");

            if ("Point".equalsIgnoreCase(geoType) && coords.isArray() && coords.size() >= 2) {
                double x = coords.get(0).asDouble(0);
                double y = coords.get(1).asDouble(0);
                return new GeometryData("POINT", String.format("%.2f,%.2f", x, y));
            } else if ("Polygon".equalsIgnoreCase(geoType) && coords.isArray()) {
                StringBuilder coordStr = new StringBuilder();
                JsonNode ring = coords.get(0);
                if (ring.isArray()) {
                    for (JsonNode point : ring) {
                        if (coordStr.length() > 0) coordStr.append(";");
                        coordStr.append(String.format("%.2f,%.2f", point.get(0).asDouble(), point.get(1).asDouble()));
                    }
                }
                return new GeometryData("POLYGON", coordStr.toString());
            }
        }

        return new GeometryData("UNKNOWN", "");
    }

    private GeometryData parseRectangle(String svg) {
        double x = parseDouble(extractAttribute(svg, "x"));
        double y = parseDouble(extractAttribute(svg, "y"));
        double width = parseDouble(extractAttribute(svg, "width"));
        double height = parseDouble(extractAttribute(svg, "height"));

        // Format: x,y,width,height
        String coords = String.format("%.2f,%.2f,%.2f,%.2f", x, y, width, height);
        return new GeometryData("RECT", coords);
    }

    private GeometryData parseCircle(String svg) {
        double cx = parseDouble(extractAttribute(svg, "cx"));
        double cy = parseDouble(extractAttribute(svg, "cy"));
        double r = parseDouble(extractAttribute(svg, "r"));

        // If radius is very small (< 5), treat as point
        if (r < 5) {
            String coords = String.format("%.2f,%.2f", cx, cy);
            return new GeometryData("POINT", coords);
        }

        // Format: cx,cy,radius
        String coords = String.format("%.2f,%.2f,%.2f", cx, cy, r);
        return new GeometryData("CIRCLE", coords);
    }

    private GeometryData parseEllipse(String svg) {
        double cx = parseDouble(extractAttribute(svg, "cx"));
        double cy = parseDouble(extractAttribute(svg, "cy"));
        double rx = parseDouble(extractAttribute(svg, "rx"));
        double ry = parseDouble(extractAttribute(svg, "ry"));

        // Format: cx,cy,rx,ry
        String coords = String.format("%.2f,%.2f,%.2f,%.2f", cx, cy, rx, ry);
        return new GeometryData("ELLIPSE", coords);
    }

    private GeometryData parsePolygon(String svg) {
        String pointsAttr = extractAttribute(svg, "points");

        if (pointsAttr == null || pointsAttr.isEmpty()) {
            return new GeometryData("POLYGON", "");
        }

        // Parse points: "x1,y1 x2,y2 x3,y3" or "x1 y1 x2 y2"
        // Convert to semicolon-separated format: "x1,y1;x2,y2;x3,y3"
        StringBuilder coords = new StringBuilder();
        String[] parts = pointsAttr.trim().split("\\s+");

        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();
            if (part.isEmpty()) continue;

            if (part.contains(",")) {
                // Format: "x,y"
                if (coords.length() > 0) coords.append(";");
                coords.append(part);
            } else {
                // Format: "x y" - need to pair with next
                if (i + 1 < parts.length) {
                    if (coords.length() > 0) coords.append(";");
                    coords.append(part).append(",").append(parts[i + 1].trim());
                    i++; // Skip next
                }
            }
        }

        return new GeometryData("POLYGON", coords.toString());
    }

    private GeometryData parsePath(String svg) {
        String d = extractAttribute(svg, "d");

        if (d == null || d.isEmpty()) {
            return new GeometryData("FREEHAND", "");
        }

        // Extract all coordinate pairs from path
        // Path format: "M x y L x y L x y ..." or "M x,y L x,y ..."
        StringBuilder coords = new StringBuilder();
        Pattern coordPattern = Pattern.compile("[-+]?\\d*\\.?\\d+");
        Matcher matcher = coordPattern.matcher(d);

        List<Double> numbers = new ArrayList<>();
        while (matcher.find()) {
            try {
                numbers.add(Double.parseDouble(matcher.group()));
            } catch (NumberFormatException ignored) {}
        }

        // Pair numbers as x,y coordinates
        for (int i = 0; i < numbers.size() - 1; i += 2) {
            if (coords.length() > 0) coords.append(";");
            coords.append(String.format("%.2f,%.2f", numbers.get(i), numbers.get(i + 1)));
        }

        return new GeometryData("FREEHAND", coords.toString());
    }

    private String extractAttribute(String svg, String attrName) {
        Pattern pattern = Pattern.compile(attrName + "=\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(svg);

        if (matcher.find()) {
            return matcher.group(1);
        }

        return "0";
    }

    private double parseDouble(String value) {
        if (value == null || value.isEmpty()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}

