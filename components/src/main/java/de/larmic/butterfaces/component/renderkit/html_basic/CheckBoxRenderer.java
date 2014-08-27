package de.larmic.butterfaces.component.renderkit.html_basic;

import de.larmic.butterfaces.component.html.HtmlCheckBox;
import de.larmic.butterfaces.component.html.HtmlInputComponent;
import de.larmic.butterfaces.component.partrenderer.*;

import javax.faces.component.UIComponent;
import javax.faces.context.FacesContext;
import javax.faces.context.ResponseWriter;
import javax.faces.render.FacesRenderer;
import java.io.IOException;

/**
 * larmic butterfaces components - An jsf 2 component extension
 * https://bitbucket.org/larmicBB/larmic-butterfaces-components
 * <p/>
 * Copyright 2013 by Lars Michaelis <br/>
 * Released under the MIT license http://opensource.org/licenses/mit-license.php
 */
@FacesRenderer(componentFamily = HtmlCheckBox.COMPONENT_FAMILY, rendererType = HtmlCheckBox.RENDERER_TYPE)
public class CheckBoxRenderer extends com.sun.faces.renderkit.html_basic.CheckboxRenderer {

    @Override
    public void encodeBegin(final FacesContext context, final UIComponent component) throws IOException {
        super.encodeBegin(context, component);

        final HtmlInputComponent htmlComponent = (HtmlInputComponent) component;
        final ResponseWriter writer = context.getResponseWriter();

        // Open outer component wrapper div
        new OuterComponentWrapperPartRenderer().renderComponentBegin(htmlComponent, writer);

        // Render label if components label attribute is set
        new LabelPartRenderer().renderLabel(htmlComponent, writer);

        // Open inner component wrapper div
        new InnterComponentWrapperPartRenderer().renderInnerWrapperBegin(htmlComponent, writer);

        // Render readonly span if components readonly attribute is set
        new ReadonlyPartRenderer().renderReadonly(htmlComponent, writer);
    }

    @Override
    public void encodeEnd(final FacesContext context, final UIComponent component) throws IOException {
        final HtmlInputComponent htmlComponent = (HtmlInputComponent) component;
        final ResponseWriter writer = context.getResponseWriter();

        if (!htmlComponent.isReadonly()) {
            super.encodeEnd(context, component);
        }

        // Render tooltip if components tooltip attribute is set
        new TooltipPartRenderer().renderTooltip(htmlComponent, true, writer, context);

        // Close inner component wrapper div
        new InnterComponentWrapperPartRenderer().renderInnerWrapperEnd(htmlComponent, writer);

        // Open outer component wrapper div
        new OuterComponentWrapperPartRenderer().renderComponentEnd(writer);
    }
}