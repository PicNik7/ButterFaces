package de.larmic.butterfaces.component.renderkit.html_basic.text.part;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import de.larmic.butterfaces.model.tree.DefaultNodeImpl;
import de.larmic.butterfaces.model.tree.Node;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;


public class TrivialComponentsEntriesNodePartRendererTest {

   private List<Node> nodeList;
   private Map<Integer, Node> nodeMap;

   @Before
   public void setUp() throws Exception {
      nodeList = new ArrayList<>();
      nodeList.add(createNode("unit-test-node-name-1", "unit-test-node-description-1"));
      nodeList.add(createNode("unit-test-node-name-2</script>", "unit-test-node-description-2"));
      nodeList.add(createNode("unit-test-node-name-3</script", "unit-test-node-description-3"));

      nodeMap = new HashMap<>();
      nodeMap.put(0, createNode("unit-test-node-name-4", "unit-test-node-description-4"));
      nodeMap.put(1, createNode("unit-test-node-name-5", "unit-test-node-description-5"));
      nodeMap.put(2, createNode("unit-test-node-name-6", "unit-test-node-description-6"));
   }

   @Test
   public void testRenderEntriesAsJSONNodesWithScriptEndTag() throws Exception {
      StringBuilder stringBuilder = new StringBuilder();
      stringBuilder.append(
            new TrivialComponentsEntriesNodePartRenderer().renderEntriesAsJSON(nodeList, Collections.<String>emptyList(), nodeMap));

      Assert.assertFalse(stringBuilder.toString().contains("</script>"));
      Assert.assertFalse(stringBuilder.toString().contains("</script"));
   }

   private DefaultNodeImpl createNode(final String title, final String description) {
      return new DefaultNodeImpl(title) {
         @Override
         public String getDescription() {
            return description;
         }
      };
   }
}