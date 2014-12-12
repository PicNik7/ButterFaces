package de.larmic.butterfaces.component.showcase;

/**
 * @deprecated use {@link de.larmic.butterfaces.component.showcase.AbstractCodeShowcase} instead.
 */
@Deprecated
public abstract class AbstractShowcaseSingleCodeComponent {

    private boolean rendered = true;
    private boolean disabled = false;

    public abstract String getXHtml();

    /**
     * Is called by getCss() and can be used to add custom css output.
     */
    protected void addCss(final StringBuilder sb) {

    }

    /**
     * Is called by getJS() and can be used to add custom js output.
     */
    protected void addJs(final StringBuilder sb) {

    }

    /**
     * Is called by getJavaCode() and can be used to add custom java code output.
     */
    protected void addJavaCode(final StringBuilder sb) {

    }

    protected void appendString(final String attribute, final String value, final StringBuilder sb, final boolean isLastValue) {
        if (value != null && !"".equals(value)) {
            sb.append(getEmptyDistanceString() + attribute + "=\"" + value + "\"" + (isLastValue ? ">" : "") + " \n");
        }
    }

    protected void appendString(final String attribute, final String value, final StringBuilder sb) {
        this.appendString(attribute, value, sb, false);
    }

    protected void appendBoolean(final String attribute, final boolean value, final StringBuilder sb, final boolean isLastValue) {
        if (value || isLastValue) {
            sb.append(getEmptyDistanceString() + attribute + "=\"" + value + "\"" + (isLastValue ? ">" : "") + " \n");
        }
    }

    protected void appendBoolean(final String attribute, final boolean value, final StringBuilder sb) {
        this.appendBoolean(attribute, value, sb, false);
    }

    protected String getEmptyDistanceString() {
        return "                ";
    }

    protected void addXhtmlStart(final StringBuilder sb) {
        addXhtmlStart(sb, "<h:head />");
    }

    protected void addXhtmlStart(final StringBuilder sb, final String head) {
        sb.append("<!DOCTYPE html>");
        sb.append("\n");
        sb.append("<html xmlns=\"http://www.w3.org/1999/xhtml\"");
        sb.append("\n");
        sb.append("      xmlns:h=\"http://java.sun.com/jsf/html\"");
        sb.append("\n");
        sb.append("      xmlns:f=\"http://java.sun.com/jsf/core\"");
        sb.append("\n");
        sb.append("      xmlns:b=\"http://butterfaces.larmic.de/components\">");
        sb.append("\n");
        sb.append(head);
        sb.append("\n");
        sb.append("<body>");
        sb.append("\n");
        sb.append("    <form>");
        sb.append("\n");
    }

    protected void addXhtmlEnd(final StringBuilder sb) {
        sb.append("\n");
        sb.append("    </form>");
        sb.append("\n");
        sb.append("</body>");
        sb.append("\n");
        sb.append("</html>");
    }

    public String getJavaCode() {
        final StringBuilder sb = new StringBuilder();

        this.addJavaCode(sb);

        return sb.toString();
    }

    public String getCss() {
        final StringBuilder sb = new StringBuilder();

        this.addCss(sb);

        return sb.toString();
    }

    public String getJs() {
        final StringBuilder sb = new StringBuilder();

        this.addJs(sb);

        return sb.toString();
    }

    public boolean isRendered() {
        return this.rendered;
    }

    public void setRendered(final boolean rendered) {
        this.rendered = rendered;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public void setDisabled(boolean disabled) {
        this.disabled = disabled;
    }
}
